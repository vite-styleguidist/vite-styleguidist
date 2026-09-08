import React from 'react';
import { act, render } from '@testing-library/react';
import ScrollSyncedToc, { collectSlugs, HASH_WRITE_DELAY } from './ScrollSyncedToc.js';

// The spy itself is covered by src/client/utils/__tests__/useScrollSpy.spec.ts; what is
// under test here is the wiring: which ids it is given, whether its answer reaches the
// sidebar, and what the 'hash' mode does with it.
const useScrollSpy = vi.hoisted(() => vi.fn());
vi.mock('../../utils/useScrollSpy.js', () => ({ default: useScrollSpy }));

const sections = [
	{
		visibleName: 'Buttons',
		name: 'Buttons',
		href: '/#buttons',
		slug: 'buttons',
		components: [
			{ visibleName: 'Button', name: 'Button', href: '/#button', slug: 'button' },
			{ visibleName: 'PushButton', name: 'PushButton', href: '/#pushbutton', slug: 'pushbutton' },
		],
	},
];

const currentLink = (container: HTMLElement) =>
	container.querySelector('[data-testid="rsg-toc-link"][aria-current="true"]')?.textContent;

beforeEach(() => {
	useScrollSpy.mockReturnValue(undefined);
});

afterEach(() => {
	// Reset the URL before the spies go, so that this call is not recorded on the
	// `replaceState` spy the next test inherits
	window.history.replaceState(null, '', '/');
	vi.restoreAllMocks();
	vi.clearAllMocks();
});

describe('collectSlugs', () => {
	it('should collect the slug of every section and component, at any depth', () => {
		expect(
			collectSlugs([
				{
					slug: 'docs',
					sections: [{ slug: 'installation' }, { slug: 'usage', components: [{ slug: 'button' }] }],
				},
				{ slug: 'components', components: [{ slug: 'input' }, { slug: 'textarea' }] },
				// A section without a slug (the implicit root of a one-section guide) contributes
				// nothing itself but its children still count
				{ components: [{ slug: 'tooltip' }] },
			])
		).toEqual(['docs', 'installation', 'usage', 'button', 'components', 'input', 'textarea', 'tooltip']);
	});
});

it('should watch every slug of the tree', () => {
	render(<ScrollSyncedToc sections={sections} />);

	expect(useScrollSpy).toHaveBeenCalledWith(['buttons', 'button', 'pushbutton'], { enabled: true });
});

it('should select the entry the spy reports, whatever the route says', () => {
	window.history.replaceState(null, '', '/#button');
	useScrollSpy.mockReturnValue('pushbutton');

	const { container } = render(<ScrollSyncedToc sections={sections} />);

	expect(currentLink(container)).toBe('PushButton');
});

it('should leave the selection to the route when the spy has no answer', () => {
	window.history.replaceState(null, '', '/#button');

	const { container } = render(<ScrollSyncedToc sections={sections} />);

	expect(currentLink(container)).toBe('Button');
});

it.each([
	['scrollSync: false', { scrollSync: false as const }],
	['a display mode with nothing to spy on', { enabled: false }],
])('should turn the spy off for %s', (_name, props) => {
	render(<ScrollSyncedToc sections={sections} {...props} />);

	expect(useScrollSpy).toHaveBeenCalledWith(expect.any(Array), { enabled: false });
});

describe('scrollSync: "hash"', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	/** Renders and lets the debounce expire. */
	const renderAndSettle = (element: React.ReactElement) => {
		const replaceState = vi.spyOn(window.history, 'replaceState');
		const rendered = render(element);
		act(() => {
			vi.advanceTimersByTime(HASH_WRITE_DELAY);
		});
		return { ...rendered, replaceState };
	};

	it('should rewrite the fragment with replaceState and no event', () => {
		useScrollSpy.mockReturnValue('pushbutton');
		const historyLength = window.history.length;
		const onHashChange = vi.fn();
		window.addEventListener('hashchange', onHashChange);

		const { replaceState } = renderAndSettle(
			<ScrollSyncedToc sections={sections} scrollSync="hash" />
		);

		// A plain `#slug`, which is inert in the default display mode
		expect(replaceState).toHaveBeenCalledWith(null, '', '/#pushbutton');
		expect(window.location.hash).toBe('#pushbutton');
		expect(window.history.length).toBe(historyLength);
		expect(onHashChange).not.toHaveBeenCalled();
		window.removeEventListener('hashchange', onHashChange);
	});

	it('should wait for the scrolling to settle before writing', () => {
		useScrollSpy.mockReturnValue('button');
		const replaceState = vi.spyOn(window.history, 'replaceState');

		const { rerender } = render(<ScrollSyncedToc sections={sections} scrollSync="hash" />);
		act(() => {
			vi.advanceTimersByTime(HASH_WRITE_DELAY - 1);
		});
		expect(replaceState).not.toHaveBeenCalled();

		// Scrolled past `button` before the timer fired: only the value that survives the
		// quiet period is written, so a flick through a guide is one call, not one per anchor
		useScrollSpy.mockReturnValue('pushbutton');
		rerender(<ScrollSyncedToc sections={sections} scrollSync="hash" />);
		act(() => {
			vi.advanceTimersByTime(HASH_WRITE_DELAY);
		});

		expect(replaceState).toHaveBeenCalledTimes(1);
		expect(replaceState).toHaveBeenCalledWith(null, '', '/#pushbutton');
	});

	it('should not write an unchanged fragment', () => {
		window.history.replaceState(null, '', '/#button');
		useScrollSpy.mockReturnValue('button');

		const { replaceState } = renderAndSettle(
			<ScrollSyncedToc sections={sections} scrollSync="hash" />
		);

		expect(replaceState).not.toHaveBeenCalled();
	});

	it.each(['#!/Button', '#/Components/Buttons?id=button'])(
		'should never rewrite the route %s',
		(hash) => {
			window.history.replaceState(null, '', `/${hash}`);
			useScrollSpy.mockReturnValue('pushbutton');

			const { replaceState } = renderAndSettle(
				<ScrollSyncedToc sections={sections} scrollSync="hash" />
			);

			expect(replaceState).not.toHaveBeenCalled();
		}
	);

	it('should not touch the URL in the default selection mode', () => {
		useScrollSpy.mockReturnValue('pushbutton');

		const { replaceState } = renderAndSettle(<ScrollSyncedToc sections={sections} />);

		expect(replaceState).not.toHaveBeenCalled();
		expect(window.location.hash).toBe('');
	});
});
