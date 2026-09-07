import {
	applyLoadedDocs,
	getLoadedDocs,
	getLoadedModule,
	loadAllComponentDocs,
	loadComponentDocs,
	placeholderDocs,
	refreshLoadedDocs,
	resetComponentDocs,
	subscribeToComponent,
	subscribeToLoads,
	subscribeToTree,
	withPlaceholderDocs,
} from '../componentDocs.js';
import type * as Rsg from '../../../typings/index.js';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Whole-guide re-renders are scheduled on an animation frame, so the frames are driven by
 * hand here: it is what makes “one re-render per batch, not one per component” testable.
 */
let frames: FrameRequestCallback[] = [];
const runFrame = () => frames.splice(0).forEach((callback) => callback(0));

const makeComponent = (
	docs: Rsg.ComponentDocs,
	overrides: Partial<Rsg.Component> = {}
): Rsg.Component & { loads: number } => {
	const component = {
		filepath: 'components/Button/Button.js',
		slug: 'button',
		nameFromPath: 'Button',
		loads: 0,
		loadDocs: () => {
			component.loads += 1;
			return Promise.resolve({ props: docs, module: { default: 'Button module' } });
		},
		...overrides,
	};
	return component;
};

beforeEach(() => {
	resetComponentDocs();
	frames = [];
	vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
		frames.push(callback)
	);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('loadComponentDocs', () => {
	it('should load the documentation once, however often it is asked for', async () => {
		const component = makeComponent({ displayName: 'Button', description: 'Push me' });

		loadComponentDocs(component);
		loadComponentDocs(component);
		await flush();
		loadComponentDocs(component);

		expect(component.loads).toBe(1);
		expect(getLoadedDocs(component)).toEqual({ displayName: 'Button', description: 'Push me' });
		expect(getLoadedModule(component)).toEqual({ default: 'Button module' });
	});

	it('should do nothing for a component whose documentation is in the tree', async () => {
		const component: Rsg.Component = { filepath: 'a.js', props: { displayName: 'Foo' } };
		loadComponentDocs(component);
		await flush();
		expect(getLoadedDocs(component)).toBeUndefined();
	});

	it('should notify the component that asked for it', async () => {
		const component = makeComponent({ displayName: 'Button' });
		const listener = vi.fn();
		subscribeToComponent(component, listener);

		loadComponentDocs(component);
		await flush();

		expect(listener).toHaveBeenCalledTimes(1);
	});

	it('should not rebuild the tree when the documentation says what the file path said', async () => {
		const component = makeComponent({ displayName: 'Button', visibleName: 'Button' });
		const listener = vi.fn();
		subscribeToTree(listener);

		loadComponentDocs(component);
		await flush();
		runFrame();

		expect(listener).not.toHaveBeenCalled();
	});

	it('should rebuild the tree when the documented name is not the file name', async () => {
		const component = makeComponent({ displayName: 'FancyButton' });
		const listener = vi.fn();
		subscribeToTree(listener);

		loadComponentDocs(component);
		await flush();
		runFrame();

		expect(listener).toHaveBeenCalledTimes(1);
	});

	it('should rebuild the tree when the page is built from the documentation', async () => {
		const component = makeComponent({ displayName: 'Button' });
		const listener = vi.fn();
		subscribeToTree(listener);

		loadComponentDocs(component, { refreshTree: true });
		await flush();
		runFrame();

		expect(listener).toHaveBeenCalledTimes(1);
	});

	it('should coalesce the rebuilds of one batch into one', async () => {
		const first = makeComponent({ displayName: 'One' }, { filepath: 'One.js' });
		const second = makeComponent({ displayName: 'Two' }, { filepath: 'Two.js' });
		const listener = vi.fn();
		subscribeToTree(listener);

		loadComponentDocs(first, { refreshTree: true });
		loadComponentDocs(second, { refreshTree: true });
		await flush();
		expect(frames).toHaveLength(1);
		runFrame();

		expect(listener).toHaveBeenCalledTimes(1);
	});

	it('should report a failed load and let it be retried', async () => {
		const error = new Error('Network down');
		let attempts = 0;
		const component: Rsg.Component = {
			filepath: 'Button.js',
			nameFromPath: 'Button',
			loadDocs: () => {
				attempts += 1;
				return attempts === 1
					? Promise.reject(error)
					: Promise.resolve({ props: { displayName: 'Button' } });
			},
		};
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

		loadComponentDocs(component);
		await flush();
		expect(consoleError).toHaveBeenCalledWith(
			expect.stringContaining('Cannot load the documentation of Button'),
			error
		);
		expect(getLoadedDocs(component)).toBeUndefined();

		loadComponentDocs(component);
		await flush();
		expect(getLoadedDocs(component)).toEqual({ displayName: 'Button' });
		consoleError.mockRestore();
	});
});

describe('loadAllComponentDocs', () => {
	it('should load every component of the tree that is still on demand', async () => {
		const first = makeComponent({ displayName: 'One' }, { filepath: 'One.js' });
		const second = makeComponent({ displayName: 'Two' }, { filepath: 'Two.js' });
		const sections: Rsg.Section[] = [
			{ components: [first], sections: [{ components: [second] }] },
		];

		loadAllComponentDocs(sections);
		await flush();

		expect(getLoadedDocs(first)).toEqual({ displayName: 'One' });
		expect(getLoadedDocs(second)).toEqual({ displayName: 'Two' });
	});
});

describe('refreshLoadedDocs', () => {
	it('should re-import only the documentation that is on the page', async () => {
		const loaded = makeComponent({ displayName: 'One' }, { filepath: 'One.js' });
		const untouched = makeComponent({ displayName: 'Two' }, { filepath: 'Two.js' });
		loadComponentDocs(loaded);
		await flush();

		// A hot update: the same components, with loaders pointing at the new modules
		const edited = makeComponent(
			{ displayName: 'One', description: 'Edited' },
			{ filepath: 'One.js' }
		);
		const listener = vi.fn();
		subscribeToTree(listener);
		refreshLoadedDocs([{ components: [edited, untouched] }]);
		await flush();
		runFrame();

		expect(getLoadedDocs(edited)).toEqual({ displayName: 'One', description: 'Edited' });
		expect(untouched.loads).toBe(0);
		expect(listener).toHaveBeenCalledTimes(1);
	});

	// ADR 0019 promises a hot update as one of the retries of a failed load, and this is the
	// retry that can actually succeed after a network failure: a browser remembers a module
	// whose fetch failed and will not fetch the same URL again, and a hot update's loaders
	// point at new URLs.
	it('should retry a component whose load failed', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const failing = makeComponent({ displayName: 'One' }, { filepath: 'One.js' });
		failing.loadDocs = () => Promise.reject(new Error('Failed to fetch'));
		loadComponentDocs(failing);
		await flush();
		expect(getLoadedDocs(failing)).toBeUndefined();

		const fixed = makeComponent({ displayName: 'One', description: 'Back' }, { filepath: 'One.js' });
		refreshLoadedDocs([{ components: [fixed] }] as unknown as Rsg.Section[]);
		await flush();
		runFrame();

		expect(fixed.loads).toBe(1);
		expect(getLoadedDocs(fixed)).toEqual({ displayName: 'One', description: 'Back' });
		error.mockRestore();
	});
});

describe('subscribeToLoads', () => {
	it('should say when a load has settled, either way', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const listener = vi.fn();
		subscribeToLoads(listener);

		loadComponentDocs(makeComponent({ displayName: 'One' }, { filepath: 'One.js' }));
		await flush();
		expect(listener).toHaveBeenCalledTimes(1);

		const failing = makeComponent({ displayName: 'Two' }, { filepath: 'Two.js' });
		failing.loadDocs = () => Promise.reject(new Error('Failed to fetch'));
		loadComponentDocs(failing);
		await flush();
		expect(listener).toHaveBeenCalledTimes(2);
		error.mockRestore();
	});
});

describe('applyLoadedDocs', () => {
	it('should give a component the documentation the store has for it', async () => {
		const component = makeComponent({
			displayName: 'Button',
			visibleName: 'The Best Button',
			examples: ['a'] as any[],
			example: ['b'] as any[],
		});
		const placeholder = withPlaceholderDocs(component);
		expect(applyLoadedDocs(placeholder)).toBe(placeholder);

		loadComponentDocs(component);
		await flush();

		const resolved = applyLoadedDocs(placeholder);
		expect(resolved.docsLoaded).toBe(true);
		expect(resolved.name).toBe('Button');
		expect(resolved.visibleName).toBe('The Best Button');
		expect(resolved.props?.examples).toEqual(['a', 'b']);
		expect(resolved.module).toEqual({ default: 'Button module' });
	});

	it('should leave a component whose documentation is in the tree alone', () => {
		const component: Rsg.Component = { props: { displayName: 'Foo' }, docsLoaded: true };
		expect(applyLoadedDocs(component)).toBe(component);
	});
});

describe('withPlaceholderDocs', () => {
	it('should name the component after its file and document nothing', () => {
		const component = withPlaceholderDocs({ nameFromPath: 'Button', slug: 'button' });
		expect(component).toMatchObject({
			name: 'Button',
			visibleName: 'Button',
			docsLoaded: false,
			props: placeholderDocs('Button'),
		});
		expect(component.props?.examples).toEqual([]);
		expect(component.props?.props).toEqual([]);
	});
});
