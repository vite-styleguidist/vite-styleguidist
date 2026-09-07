import { act, renderHook } from '@testing-library/react';
import useScrollSpy, { NAVIGATION_SETTLE_MS } from '../useScrollSpy.js';
import { STICKY_OFFSET_PROPERTY } from '../../styles/styles.js';

/**
 * jsdom does no layout, so the “page” is a table of document offsets plus a scroll
 * position: every anchor reports `top = offset - scrollY`, which is what a browser would
 * report. `requestAnimationFrame` runs its callback synchronously in this suite
 * (test/setup.ts), so a dispatched scroll event settles before the next assertion.
 */
let offsets: Record<string, number> = {};
let scrollY = 0;

/** jsdom’s IntersectionObserver: it has none, and the hook must work with and without one. */
class FakeIntersectionObserver {
	public static instances: FakeIntersectionObserver[] = [];
	public observed: Element[] = [];
	public disconnected = false;
	public constructor(public callback: () => void) {
		FakeIntersectionObserver.instances.push(this);
	}
	public observe(element: Element) {
		this.observed.push(element);
	}
	public unobserve() {
		/* not used by the hook */
	}
	public disconnect() {
		this.disconnected = true;
	}
	public takeRecords() {
		return [];
	}
}

function setUpPage(
	page: Record<string, number>,
	{ documentHeight = 4000, viewportHeight = 800 } = {}
) {
	offsets = page;
	for (const id of Object.keys(page)) {
		const element = document.createElement('div');
		element.id = id;
		element.getBoundingClientRect = () => ({ top: offsets[id] - scrollY }) as DOMRect;
		document.body.append(element);
	}
	Object.defineProperty(document.documentElement, 'scrollHeight', {
		value: documentHeight,
		configurable: true,
	});
	Object.defineProperty(window, 'innerHeight', { value: viewportHeight, configurable: true });
}

/** Moves the viewport without telling anyone, so a specific trigger can be tested alone. */
function setScroll(y: number) {
	scrollY = y;
	Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
}

function scrollTo(y: number) {
	setScroll(y);
	act(() => {
		window.dispatchEvent(new Event('scroll'));
	});
}

function fire(type: string) {
	act(() => {
		window.dispatchEvent(new Event(type));
	});
}

/** Navigates the way a sidebar link does, minus the browser’s own scrolling. */
function navigateTo(hash: string) {
	window.history.replaceState(null, '', hash);
	fire('hashchange');
}

beforeEach(() => {
	vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
	FakeIntersectionObserver.instances = [];
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	document.body.innerHTML = '';
	document.documentElement.style.removeProperty(STICKY_OFFSET_PROPERTY);
	window.history.replaceState(null, '', '/');
	setScroll(0);
	offsets = {};
});

it('should do nothing at all when disabled', () => {
	setUpPage({ one: 0, two: 1000 });
	const addEventListener = vi.spyOn(window, 'addEventListener');

	const { result } = renderHook(() => useScrollSpy(['one', 'two'], { enabled: false }));

	expect(result.current).toBeUndefined();
	expect(addEventListener).not.toHaveBeenCalled();
	expect(FakeIntersectionObserver.instances).toHaveLength(0);
});

it('should activate the anchor whose top last crossed the activation line', () => {
	setUpPage({ one: 0, two: 1000, three: 2000 });

	const { result } = renderHook(() => useScrollSpy(['one', 'two', 'three']));
	expect(result.current).toBe('one');

	// 600 px wheel steps: the step size an observer-only implementation was measured to miss
	scrollTo(600);
	expect(result.current).toBe('one');
	scrollTo(1200);
	expect(result.current).toBe('two');
	scrollTo(1800);
	expect(result.current).toBe('two');
	scrollTo(2400);
	expect(result.current).toBe('three');

	// …and back up again
	scrollTo(1800);
	expect(result.current).toBe('two');
	scrollTo(600);
	expect(result.current).toBe('one');
	scrollTo(0);
	expect(result.current).toBe('one');
});

it('should activate the first anchor above the first one', () => {
	// Nothing has crossed the line yet: the page starts with a section description
	setUpPage({ one: 400, two: 1400 });

	const { result } = renderHook(() => useScrollSpy(['one', 'two']));

	expect(result.current).toBe('one');
});

it('should activate the last anchor at the bottom of the document', () => {
	// `three` sits in the last screenful, so its top can never reach the activation line
	setUpPage({ one: 0, two: 1000, three: 3900 }, { documentHeight: 4000, viewportHeight: 800 });

	const { result } = renderHook(() => useScrollSpy(['one', 'two', 'three']));

	scrollTo(3000);
	expect(result.current).toBe('two');
	scrollTo(3200); // the very bottom: 3200 + 800 === 4000
	expect(result.current).toBe('three');
});

it('should not apply the bottom rule to a page that does not scroll', () => {
	// Otherwise a page shorter than the viewport would permanently highlight its last anchor
	setUpPage({ one: 0, two: 400 }, { documentHeight: 800, viewportHeight: 800 });

	const { result } = renderHook(() => useScrollSpy(['one', 'two']));

	expect(result.current).toBe('one');
});

it('should move the activation line with the sticky header offset', () => {
	setUpPage({ one: 0, two: 100 });
	// Small screens: the sidebar is a sticky header, so an anchor activates 105 px lower
	document.documentElement.style.setProperty(STICKY_OFFSET_PROPERTY, '105px');

	const { result } = renderHook(() => useScrollSpy(['one', 'two']));

	expect(result.current).toBe('two');
});

it('should skip ids that are not in the document', () => {
	setUpPage({ one: 0, three: 2000 });

	const { result } = renderHook(() => useScrollSpy(['one', 'two', 'three']));

	scrollTo(2400);
	expect(result.current).toBe('three');
});

it('should report nothing when none of the ids is in the document', () => {
	setUpPage({});

	const { result } = renderHook(() => useScrollSpy(['one', 'two']));

	scrollTo(1000);
	expect(result.current).toBeUndefined();
});

it('should observe every anchor and recompute when the observer fires', () => {
	setUpPage({ one: 0, two: 1000 });

	const { result } = renderHook(() => useScrollSpy(['one', 'two']));

	const [observer] = FakeIntersectionObserver.instances;
	expect(observer.observed.map((element) => element.id)).toEqual(['one', 'two']);

	// No scroll event: the observer alone has to be enough to notice
	setScroll(1200);
	act(() => observer.callback());
	expect(result.current).toBe('two');
});

it('should work without an IntersectionObserver', () => {
	vi.stubGlobal('IntersectionObserver', undefined);
	setUpPage({ one: 0, two: 1000 });

	const { result } = renderHook(() => useScrollSpy(['one', 'two']));

	scrollTo(1200);
	expect(result.current).toBe('two');
});

it('should stop listening when unmounted', () => {
	setUpPage({ one: 0, two: 1000 });
	const removeEventListener = vi.spyOn(window, 'removeEventListener');

	const { unmount } = renderHook(() => useScrollSpy(['one', 'two']));
	unmount();

	expect(FakeIntersectionObserver.instances[0].disconnected).toBe(true);
	for (const type of ['scroll', 'wheel', 'touchmove', 'resize', 'hashchange']) {
		expect(removeEventListener).toHaveBeenCalledWith(type, expect.any(Function));
	}
});

describe('following a link', () => {
	let clock = 0;

	beforeEach(() => {
		clock = 1000;
		vi.spyOn(performance, 'now').mockImplementation(() => clock);
	});

	it('should select the target at once and ignore the scroll it causes', () => {
		setUpPage({ one: 0, two: 1000, three: 3900 }, { documentHeight: 4000, viewportHeight: 800 });
		const { result } = renderHook(() => useScrollSpy(['one', 'two', 'three']));
		expect(result.current).toBe('one');

		navigateTo('#three');
		expect(result.current).toBe('three');

		// The browser scrolls to the bottom of the page; geometry would say `three` here only
		// because of the bottom rule, so scroll somewhere the geometry disagrees instead
		clock += 50;
		scrollTo(600);
		expect(result.current).toBe('three');
	});

	it('should hand control back on the reader’s first wheel', () => {
		setUpPage({ one: 0, two: 1000, three: 2000 });
		const { result } = renderHook(() => useScrollSpy(['one', 'two', 'three']));

		navigateTo('#three');
		expect(result.current).toBe('three');

		setScroll(600);
		fire('wheel');
		expect(result.current).toBe('one');
	});

	it('should hand control back on a scroll once the navigation has settled', () => {
		// Keyboard scrolling and dragging the scrollbar send no wheel or touch event
		setUpPage({ one: 0, two: 1000, three: 2000 });
		const { result } = renderHook(() => useScrollSpy(['one', 'two', 'three']));

		navigateTo('#three');
		clock += NAVIGATION_SETTLE_MS + 1;
		scrollTo(1200);

		expect(result.current).toBe('two');
	});

	it('should ignore a hash that is a route rather than an anchor', () => {
		setUpPage({ one: 0, two: 1000 });
		const { result } = renderHook(() => useScrollSpy(['one', 'two']));

		navigateTo('#!/Button');

		expect(result.current).toBe('one');
		// …and the spy still follows the scroll, i.e. nothing was pinned
		scrollTo(1200);
		expect(result.current).toBe('two');
	});

	it('should start pinned on a deep link', () => {
		setUpPage({ one: 0, two: 1000, three: 2000 });
		window.history.replaceState(null, '', '#three');

		const { result } = renderHook(() => useScrollSpy(['one', 'two', 'three']));

		// The browser has not scrolled yet, so geometry would answer `one`
		expect(result.current).toBe('three');
		clock += 100;
		scrollTo(0);
		expect(result.current).toBe('three');
	});
});
