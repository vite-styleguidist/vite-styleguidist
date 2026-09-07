import React from 'react';
import { render } from '@testing-library/react';
import ReactComponent, { DOCS_ROOT_MARGIN } from './ReactComponent.js';
import { placeholderDocs, resetComponentDocs } from '../../utils/componentDocs.js';
import slots from '../slots/index.js';
import Context from '../Context/index.js';
import { DisplayModes } from '../../consts.js';
import type * as Rsg from '../../../typings/index.js';

const context = {
	config: {
		pagePerSection: false,
	},
	displayMode: DisplayModes.all,
	slots: slots(),
};

const Provider = (props: any) => <Context.Provider value={context} {...props} />;

// Examples are evaluated as plain functions with a `require` that only knows React,
// the way the real evalInContext (src/loaders/utils/client/evalInContext.ts) works with
// the modules bundled for the style guide
const requireInExample = (name: string) => {
	if (name === 'react') {
		return React;
	}
	throw new Error(`Cannot find module '${name}'`);
};
const evalInContext = (code: string) =>
	new Function('require', `const React = require("react");${code}`).bind(null, requireInExample);

const component = {
	name: 'Foo',
	visibleName: 'Foo',
	slug: 'foo',
	href: '#foo',
	pathLine: 'foo/bar.js',
	props: {
		description: 'Bar',
		methods: [],
		examples: [],
	},
	metadata: {},
};

const componentWithEverything: Rsg.Component = {
	name: 'Foo',
	visibleName: 'Foo',
	slug: 'foo',
	pathLine: 'foo/bar.js',
	props: {
		description: 'Bar',
		methods: [
			{
				name: 'set',
				params: [
					{
						name: 'newValue',
						optional: false,
						description: 'New value for the counter.',
						type: { type: 'NameExpression', name: 'Number' },
					},
				],
				returns: null,
				description: 'Sets the counter to a particular value.',
				docblock: null,
				modifiers: [],
			},
		],
		examples: [
			{
				type: 'code',
				content: '<button>Code: OK</button>',
				evalInContext,
			},
			{
				type: 'markdown',
				content: 'Markdown: Hello *world*!',
			},
		],
	},
	metadata: {
		tags: ['one', 'two'],
	},
};

test('should render an example placeholder', () => {
	const { getByText } = render(
		<Provider>
			<ReactComponent component={component} depth={3} exampleMode="collapse" usageMode="collapse" />
		</Provider>
	);
	expect(getByText(/add examples to this component/i)).toBeInTheDocument();
});

test('should render examples', () => {
	const { getByText } = render(
		<Provider>
			<ReactComponent
				component={componentWithEverything}
				depth={3}
				exampleMode="collapse"
				usageMode="collapse"
			/>
		</Provider>
	);
	expect(getByText(/code: ok/i)).toBeInTheDocument();
	expect(getByText(/markdown: hello/i)).toBeInTheDocument();
});

test('should render usage closed by default when usageMode is "collapse"', () => {
	const { getByText } = render(
		<Provider>
			<ReactComponent
				component={componentWithEverything}
				depth={3}
				exampleMode="collapse"
				usageMode="collapse"
			/>
		</Provider>
	);
	expect(getByText(/props & methods/i)).toHaveAttribute('aria-pressed', 'false');
});

test('should render usage opened by default when usageMode is "expand"', () => {
	const { getByText } = render(
		<Provider>
			<ReactComponent
				component={componentWithEverything}
				depth={3}
				exampleMode="collapse"
				usageMode="expand"
			/>
		</Provider>
	);
	expect(getByText(/props & methods/i)).toHaveAttribute('aria-pressed', 'true');
});

test('should not render usage when usageMode is "hide"', () => {
	const { queryByText } = render(
		<Provider>
			<ReactComponent
				component={componentWithEverything}
				depth={3}
				exampleMode="collapse"
				usageMode="hide"
			/>
		</Provider>
	);
	expect(queryByText(/props & methods/i)).not.toBeInTheDocument();
});

test('should not render anything when component has no name', () => {
	const { container } = render(
		<Provider>
			<ReactComponent
				component={{ slug: 'foo', props: {} }}
				depth={3}
				exampleMode="collapse"
				usageMode="collapse"
			/>
		</Provider>
	);
	expect(container).toBeEmptyDOMElement();
});

test('should not render component in isolation mode by default', () => {
	const { getByLabelText } = render(
		<Provider>
			<ReactComponent component={component} depth={3} exampleMode="collapse" usageMode="collapse" />
		</Provider>
	);
	expect(getByLabelText(/open isolated/i)).toBeInTheDocument();
});

test('should render component in isolation mode', () => {
	const { getByLabelText } = render(
		<Provider
			value={{
				...context,
				displayMode: DisplayModes.component,
			}}
		>
			<ReactComponent component={component} depth={3} exampleMode="collapse" usageMode="collapse" />
		</Provider>
	);
	expect(getByLabelText(/show all components/i)).toBeInTheDocument();
});

test('should prefix description with deprecated label when @deprecated is present in tags', () => {
	const { getByText } = render(
		<Provider>
			<ReactComponent
				component={{
					...component,
					props: {
						tags: {
							deprecated: [
								{
									title: 'deprecated',
									description: 'I am deprecated',
								},
							],
						},
					},
				}}
				depth={3}
				exampleMode="collapse"
				usageMode="collapse"
			/>
		</Provider>
	);
	expect(getByText(/deprecated:/i)).toBeInTheDocument();
});

// `lazyDocs` (ADR 0019): the component is in the tree, its documentation is one import away
describe('on-demand documentation', () => {
	const lazyComponent = (docs: Rsg.ComponentDocs = { displayName: 'Foo', description: 'Bar' }) => {
		const loaded: Rsg.Component = {
			filepath: 'components/Foo/Foo.js',
			slug: 'foo',
			nameFromPath: 'Foo',
			name: 'Foo',
			visibleName: 'Foo',
			href: '#foo',
			pathLine: 'components/Foo/Foo.js',
			docsLoaded: false,
			props: placeholderDocs('Foo'),
			loadDocs: vi.fn(() => Promise.resolve({ props: docs })),
		};
		return loaded;
	};

	/** IntersectionObserver, with the callbacks the components registered under our control. */
	const observed: {
		element: Element;
		options?: IntersectionObserverInit;
		fire: () => void;
	}[] = [];

	beforeEach(() => {
		resetComponentDocs();
		observed.splice(0);
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
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		window.location.hash = '';
	});

	const renderComponent = (component: Rsg.Component, displayMode: string = DisplayModes.all) =>
		render(
			<Provider value={{ ...context, displayMode }}>
				<ReactComponent
					component={component}
					depth={3}
					exampleMode="collapse"
					usageMode="collapse"
				/>
			</Provider>
		);

	it('should render the heading and the container before anything is loaded', () => {
		const component = lazyComponent();
		const { getByTestId, getByRole, queryByText } = renderComponent(component);

		expect(getByTestId('Foo-container')).toBeInTheDocument();
		expect(getByRole('heading', { level: 3 })).toHaveTextContent('Foo');
		// No description, no examples, and not the “add examples” placeholder either: the
		// component has documentation, it is simply not here yet
		expect(queryByText('Bar')).not.toBeInTheDocument();
		expect(queryByText(/add examples to this component/i)).not.toBeInTheDocument();
	});

	it('should wait for the container to come near the viewport in the default mode', async () => {
		const component = lazyComponent();
		const { queryByText, findByText } = renderComponent(component);

		expect(component.loadDocs).not.toHaveBeenCalled();
		expect(queryByText('Bar')).not.toBeInTheDocument();
		// The heading of this very component is what is watched, from well below the fold
		expect(observed).toHaveLength(1);
		expect(observed[0].element).toBe(document.getElementById('foo'));
		expect(observed[0].options).toEqual({ rootMargin: DOCS_ROOT_MARGIN });

		observed[0].fire();

		expect(component.loadDocs).toHaveBeenCalledTimes(1);
		expect(await findByText('Bar')).toBeInTheDocument();
	});

	it('should load the documentation at once on a page that is one component', async () => {
		const component = lazyComponent();
		const { findByText } = renderComponent(component, DisplayModes.component);

		expect(observed).toHaveLength(0);
		expect(component.loadDocs).toHaveBeenCalledTimes(1);
		expect(await findByText('Bar')).toBeInTheDocument();
	});

	it('should load the documentation at once when a deep link points at it', async () => {
		window.location.hash = '#foo';
		const component = lazyComponent();
		const { findByText } = renderComponent(component);

		expect(observed).toHaveLength(0);
		expect(component.loadDocs).toHaveBeenCalledTimes(1);
		expect(await findByText('Bar')).toBeInTheDocument();
	});

	it('should show the “add examples” placeholder once a component is known to have none', async () => {
		const component = lazyComponent({ displayName: 'Foo', examples: [] });
		const { queryByText, findByText } = renderComponent(component, DisplayModes.component);

		expect(queryByText(/add examples to this component/i)).not.toBeInTheDocument();
		expect(await findByText(/add examples to this component/i)).toBeInTheDocument();
	});

	// React 19 remounts every component under StrictMode (mount, unmount, mount again), which
	// is the same shape as the double-invoked effects of a function component: the observer
	// has to be disconnected and set up again, and nothing may be loaded twice.
	it('should load once under StrictMode, which mounts everything twice', async () => {
		const component = lazyComponent();
		const { findByText } = render(
			<React.StrictMode>
				<Provider value={{ ...context, displayMode: DisplayModes.component }}>
					<ReactComponent
						component={component}
						depth={3}
						exampleMode="collapse"
						usageMode="collapse"
					/>
				</Provider>
			</React.StrictMode>
		);

		expect(component.loadDocs).toHaveBeenCalledTimes(1);
		expect(await findByText('Bar')).toBeInTheDocument();
	});

	it('should render a component whose documentation is in the tree without loading anything', () => {
		const { getByText } = renderComponent({ ...component, docsLoaded: true } as Rsg.Component);
		expect(observed).toHaveLength(0);
		expect(getByText('Bar')).toBeInTheDocument();
	});
});
