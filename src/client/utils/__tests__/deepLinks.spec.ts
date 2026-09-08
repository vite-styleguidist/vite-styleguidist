/**
 * Deep links on a page whose documentation is still arriving (`lazyDocs`, ADR 0019).
 *
 * Two failures this covers, both silent and both under the default configuration: a
 * fragment naming a heading inside a component’s Readme resolved to nothing at all, and a
 * link to a component near the end of the guide landed up to about 1.7 screens short of it
 * because the containers above the target loaded afterwards and pushed it down.
 */
import createDeepLinkScroller, { SETTLE_MS, scrollToElement } from '../deepLinks.js';
import { resetComponentDocs } from '../componentDocs.js';
import { STICKY_OFFSET_PROPERTY } from '../../styles/styles.js';
import type * as Rsg from '../../../typings/index.js';

/** Frames the page is given to settle, run by hand. */
let frames: (() => void)[] = [];

const runFrames = (times = 30) => {
	for (let index = 0; index < times && frames.length > 0; index++) {
		const pending = frames;
		frames = [];
		pending.forEach((frame) => frame());
	}
};

/** Where the page has been scrolled to, in order. */
let scrolled: number[] = [];
let clock = 0;

const anchorAt = (id: string, top: number) => {
	const element = document.createElement('div');
	element.id = id;
	// jsdom lays nothing out, so the element says where it is
	element.getBoundingClientRect = () => ({ top }) as DOMRect;
	document.body.appendChild(element);
	return element;
};

const scroller = (sections: Rsg.Section[] = []) =>
	createDeepLinkScroller({ getSections: () => sections, now: () => clock });

beforeEach(() => {
	resetComponentDocs();
	frames = [];
	scrolled = [];
	clock = 0;
	document.body.innerHTML = '';
	window.location.hash = '';
	vi.stubGlobal('requestAnimationFrame', (callback: () => void) => {
		frames.push(callback);
		return frames.length;
	});
	vi.spyOn(window, 'scrollTo').mockImplementation(((x: number, y: number) => {
		scrolled.push(y);
	}) as typeof window.scrollTo);
	// A sticky offset, so scrollToElement takes the `window.scrollTo` branch the spy sees
	// rather than `scrollIntoView`, which jsdom does not implement
	document.documentElement.style.setProperty(STICKY_OFFSET_PROPERTY, '10px');
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	window.location.hash = '';
});

describe('scrollToElement', () => {
	it('should leave room for the sticky header', () => {
		scrollToElement(anchorAt('here', 500));
		expect(scrolled).toEqual([490]);
	});

	it('should never scroll above the top of the page', () => {
		scrollToElement(anchorAt('here', 4));
		expect(scrolled).toEqual([0]);
	});
});

describe('a fragment that names an element on the page', () => {
	it('should scroll to it on a cold load', () => {
		anchorAt('widget39', 7372);
		window.location.hash = '#widget39';

		scroller().onLoad();

		expect(scrolled).toEqual([7362]);
	});

	// The failure this exists for: the browser clamps the scroll at a document that is
	// shorter than it is about to be, then the containers between the viewport and the
	// target load and push the target down. Nothing used to re-scroll.
	it('should follow the target while the page grows under it', async () => {
		const target = anchorAt('widget39', 7372);
		window.location.hash = '#widget39';
		const component = {
			filepath: 'components/Widget38.js',
			slug: 'widget38',
			nameFromPath: 'Widget38',
			loadDocs: () => Promise.resolve({ props: { displayName: 'Widget38' } }),
		} as unknown as Rsg.Component;
		const sections = [{ slug: 's', components: [component], sections: [] }] as unknown as
			Rsg.Section[];

		scroller(sections).onLoad();
		expect(scrolled).toEqual([7362]);

		// A component above the target fills in: the target is now 1556 px further down
		const { loadAllComponentDocs } = await import('../componentDocs.js');
		target.getBoundingClientRect = () => ({ top: 8928 }) as DOMRect;
		loadAllComponentDocs(sections);
		await Promise.resolve();
		await Promise.resolve();
		runFrames();

		expect(scrolled.at(-1)).toBe(8918);
	});

	it('should stop following as soon as the reader takes over', async () => {
		const target = anchorAt('widget39', 7372);
		window.location.hash = '#widget39';
		const component = {
			filepath: 'components/Widget38.js',
			slug: 'widget38',
			nameFromPath: 'Widget38',
			loadDocs: () => Promise.resolve({ props: { displayName: 'Widget38' } }),
		} as unknown as Rsg.Component;
		const sections = [{ slug: 's', components: [component], sections: [] }] as unknown as
			Rsg.Section[];

		scroller(sections).onLoad();
		window.dispatchEvent(new Event('wheel'));

		const { loadAllComponentDocs } = await import('../componentDocs.js');
		target.getBoundingClientRect = () => ({ top: 8928 }) as DOMRect;
		loadAllComponentDocs(sections);
		await Promise.resolve();
		await Promise.resolve();
		runFrames();

		expect(scrolled).toEqual([7362]);
	});

	it('should give up after the settling period', () => {
		anchorAt('widget39', 7372);
		window.location.hash = '#widget39';

		scroller().onLoad();
		clock += SETTLE_MS + 1;
		// The next frame is the last one
		runFrames();

		expect(scrolled).toEqual([7362]);
	});
});

describe('a fragment that names a heading inside a component’s documentation', () => {
	const componentWithHeading = (): [Rsg.Component, Rsg.Section[]] => {
		const component = {
			filepath: 'components/Widget20.js',
			slug: 'widget20',
			nameFromPath: 'Widget20',
			loadDocs: vi.fn(() => {
				// Loading the component is what draws the heading the fragment names
				anchorAt('sizes-of-widget20', 15623);
				return Promise.resolve({ props: { displayName: 'Widget20' } });
			}),
		} as unknown as Rsg.Component;
		return [
			component,
			[{ slug: 's', components: [component], sections: [] }] as unknown as Rsg.Section[],
		];
	};

	it('should load what is still on demand and scroll to it on a cold load', async () => {
		const [component, sections] = componentWithHeading();
		window.location.hash = '#sizes-of-widget20';

		scroller(sections).onLoad();
		// Ten frames of looking for an element that is not drawn yet…
		runFrames();
		expect(component.loadDocs).toHaveBeenCalledTimes(1);

		// …then the answer arrives and the element is there
		await Promise.resolve();
		await Promise.resolve();
		runFrames();

		expect(scrolled.at(-1)).toBe(15613);
	});

	it('should do the same for a fragment the page navigates to', async () => {
		const [component, sections] = componentWithHeading();
		const deepLinks = scroller(sections);

		window.location.hash = '#sizes-of-widget20';
		deepLinks.onHashChange();
		runFrames();
		expect(component.loadDocs).toHaveBeenCalledTimes(1);

		await Promise.resolve();
		await Promise.resolve();
		runFrames();

		expect(scrolled.at(-1)).toBe(15613);
	});
});

describe('a fragment that names nothing', () => {
	it('should leave the page alone on a cold load', () => {
		window.location.hash = '#!/Button';

		scroller().onLoad();
		runFrames();

		expect(scrolled).toEqual([]);
	});

	it('should go to the top of the page on a hash change', () => {
		window.location.hash = '#/';

		scroller().onHashChange();

		expect(scrolled).toEqual([0]);
	});
});
