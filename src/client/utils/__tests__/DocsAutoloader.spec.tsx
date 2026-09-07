import React from 'react';
import { render, waitFor } from '@testing-library/react';
import DocsAutoloader from '../DocsAutoloader.js';
import {
	DOCS_ROOT_MARGIN,
	getLoadedDocs,
	markSelfManaged,
	resetComponentDocs,
	subscribeToTree,
} from '../componentDocs.js';
import { DisplayModes } from '../../consts.js';
import type * as Rsg from '../../../typings/index.js';

/**
 * The safety net behind on-demand documentation: what loads a component whose renderer
 * never does, which is every guide that replaces `ReactComponent`, `Components` or
 * `Sections` through `styleguideComponents` (ADR 0019 point 5).
 */
const lazyComponent = (overrides: Partial<Rsg.Component> = {}): Rsg.Component => ({
	filepath: 'components/Foo/Foo.js',
	slug: 'foo',
	nameFromPath: 'Foo',
	name: 'Foo',
	visibleName: 'Foo',
	pathLine: 'components/Foo/Foo.js',
	docsLoaded: false,
	loadDocs: vi.fn(() => Promise.resolve({ props: { displayName: 'Foo', description: 'Bar' } })),
	...overrides,
});

const sectionWith = (...components: Rsg.Component[]): Rsg.Section[] =>
	[{ slug: 'section', components, sections: [] }] as unknown as Rsg.Section[];

/** IntersectionObserver, with the callbacks the autoloader registered under our control. */
const observed: { element: Element; options?: IntersectionObserverInit; fire: () => void }[] = [];

const stubIntersectionObserver = () =>
	vi.stubGlobal(
		'IntersectionObserver',
		class {
			constructor(
				private callback: IntersectionObserverCallback,
				private options?: IntersectionObserverInit
			) {}
			observe(element: Element) {
				observed.push({
					element,
					options: this.options,
					fire: () =>
						this.callback(
							[{ isIntersecting: true, target: element } as IntersectionObserverEntry],
							this as unknown as IntersectionObserver
						),
				});
			}
			disconnect() {}
			unobserve() {}
		}
	);

beforeEach(() => {
	resetComponentDocs();
	observed.splice(0);
	window.location.hash = '';
});

afterEach(() => {
	vi.unstubAllGlobals();
	window.location.hash = '';
});

it('should load a component nothing else is looking after', async () => {
	const component = lazyComponent();

	render(<DocsAutoloader sections={sectionWith(component)} displayMode={DisplayModes.all} />);

	expect(component.loadDocs).toHaveBeenCalledTimes(1);
	await waitFor(() => expect(getLoadedDocs(component)).toBeDefined());
});

// Styleguidist’s own ReactComponent does all of this itself, and says so; loading here as
// well would fetch the whole guide on the first render, which is what `lazyDocs` exists to
// avoid
it('should leave a component whose renderer looks after itself alone', () => {
	const component = lazyComponent();
	markSelfManaged(component);

	render(<DocsAutoloader sections={sectionWith(component)} displayMode={DisplayModes.all} />);

	expect(component.loadDocs).not.toHaveBeenCalled();
});

it('should pick the loading up again when the renderer that claimed it unmounts', () => {
	const component = lazyComponent();
	const release = markSelfManaged(component);
	const { rerender } = render(
		<DocsAutoloader sections={sectionWith(component)} displayMode={DisplayModes.all} />
	);
	expect(component.loadDocs).not.toHaveBeenCalled();

	release();
	rerender(<DocsAutoloader sections={sectionWith(component)} displayMode={DisplayModes.all} />);

	expect(component.loadDocs).toHaveBeenCalledTimes(1);
});

it('should wait for the anchor to come near the viewport on the all-in-one page', () => {
	stubIntersectionObserver();
	const anchor = document.createElement('div');
	anchor.id = 'foo';
	document.body.appendChild(anchor);
	const component = lazyComponent();

	render(<DocsAutoloader sections={sectionWith(component)} displayMode={DisplayModes.all} />);

	expect(component.loadDocs).not.toHaveBeenCalled();
	expect(observed).toHaveLength(1);
	expect(observed[0].element).toBe(anchor);
	expect(observed[0].options).toEqual({ rootMargin: DOCS_ROOT_MARGIN });

	observed[0].fire();
	expect(component.loadDocs).toHaveBeenCalledTimes(1);

	document.body.removeChild(anchor);
});

// A replacement that renders no anchor of its own has nothing to watch, so waiting for the
// viewport would mean waiting for ever (Cookbook, “What a replaced ReactComponent sees”)
it('should load right away when the component has no anchor to watch', () => {
	stubIntersectionObserver();
	const component = lazyComponent();

	render(<DocsAutoloader sections={sectionWith(component)} displayMode={DisplayModes.all} />);

	expect(observed).toHaveLength(0);
	expect(component.loadDocs).toHaveBeenCalledTimes(1);
});

it.each([DisplayModes.component, DisplayModes.example, DisplayModes.section])(
	'should load right away in the %s display mode',
	(displayMode) => {
		stubIntersectionObserver();
		const anchor = document.createElement('div');
		anchor.id = 'foo';
		document.body.appendChild(anchor);
		const component = lazyComponent();

		render(<DocsAutoloader sections={sectionWith(component)} displayMode={displayMode} />);

		expect(component.loadDocs).toHaveBeenCalledTimes(1);
		document.body.removeChild(anchor);
	}
);

it('should load the component a deep link points at right away', () => {
	stubIntersectionObserver();
	const anchor = document.createElement('div');
	anchor.id = 'foo';
	document.body.appendChild(anchor);
	window.location.hash = '#foo';
	const component = lazyComponent();

	render(<DocsAutoloader sections={sectionWith(component)} displayMode={DisplayModes.all} />);

	expect(component.loadDocs).toHaveBeenCalledTimes(1);
	document.body.removeChild(anchor);
});

// A replacement does not subscribe to its own component, so nothing but a whole-guide
// re-render can show it what arrived
it('should re-render the guide when the documentation arrives', async () => {
	const listener = vi.fn();
	subscribeToTree(listener);

	render(
		<DocsAutoloader sections={sectionWith(lazyComponent())} displayMode={DisplayModes.all} />
	);

	await waitFor(() => expect(listener).toHaveBeenCalled());
});

it('should ask for a component’s documentation once, however often it re-renders', () => {
	const component = lazyComponent();
	const { rerender } = render(
		<DocsAutoloader sections={sectionWith(component)} displayMode={DisplayModes.all} />
	);
	rerender(<DocsAutoloader sections={sectionWith(component)} displayMode={DisplayModes.all} />);
	rerender(<DocsAutoloader sections={sectionWith(component)} displayMode={DisplayModes.all} />);

	expect(component.loadDocs).toHaveBeenCalledTimes(1);
});

it('should ignore a component whose documentation is in the tree already', () => {
	const eager = lazyComponent({ loadDocs: undefined, docsLoaded: true });

	render(<DocsAutoloader sections={sectionWith(eager)} displayMode={DisplayModes.all} />);

	expect(eager.loadDocs).toBeUndefined();
});
