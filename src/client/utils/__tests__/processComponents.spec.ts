import deepfreeze from 'deepfreeze';
import processComponents from '../processComponents.js';
import { loadComponentDocs, resetComponentDocs } from '../componentDocs.js';

const options = { useRouterLinks: false };

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('processComponents', () => {
	it('should set components’ displayName to a name property', () => {
		const components = deepfreeze([
			{
				props: {
					displayName: 'Foo',
				},
			},
		]);
		const result = processComponents(components, options);
		expect(result[0].name).toBe('Foo');
	});

	it('should calculate href', () => {
		const components = deepfreeze([
			{
				slug: 'foo',
				props: {
					displayName: 'Foo',
				},
			},
		]);
		const result = processComponents(components, options);
		expect(result[0].href).toBe('/#foo');
	});

	describe('should set visibleName property on the component', () => {
		it('from an visibleName component prop if available', () => {
			const components = deepfreeze([
				{
					props: {
						displayName: 'Foo',
						visibleName: 'Foo Bar',
					},
				},
			]);
			const result = processComponents(components, options);
			expect(result[0].visibleName).toBe('Foo Bar');
		});

		it('from an displayName component prop if visibleName prop is not available', () => {
			const components = deepfreeze([
				{
					props: {
						displayName: 'Foo',
					},
				},
			]);
			const result = processComponents(components, options);
			expect(result[0].visibleName).toBe('Foo');
		});
	});

	it('should append @example doclet to all examples', () => {
		const components = deepfreeze([
			{
				props: {
					displayName: 'Foo',
					examples: [1, 2] as any[],
					example: [3, 4] as any[],
				},
			},
		]);
		const result = processComponents(components, options);
		expect(result[0].props && result[0].props.examples).toEqual([1, 2, 3, 4]);
	});
});

// `lazyDocs` (ADR 0019): the documentation is not in the tree
describe('on-demand documentation', () => {
	beforeEach(() => {
		resetComponentDocs();
	});

	const lazyComponent = (docs = { displayName: 'Foo' }) => ({
		filepath: 'components/Foo/Foo.js',
		slug: 'foo',
		nameFromPath: 'Foo',
		loadDocs: () => Promise.resolve({ props: docs }),
	});

	it('should name a component after its file until its documentation is loaded', () => {
		const [component] = processComponents([lazyComponent()], options);
		expect(component.name).toBe('Foo');
		expect(component.visibleName).toBe('Foo');
		expect(component.href).toBe('/#foo');
		expect(component.docsLoaded).toBe(false);
	});

	it('should document nothing until the documentation is loaded', () => {
		const [component] = processComponents([lazyComponent()], options);
		expect(component.props).toMatchObject({
			description: '',
			examples: [],
			methods: [],
			props: [],
		});
	});

	it('should use the loaded documentation as soon as there is any', async () => {
		const component = lazyComponent({
			displayName: 'Foo',
			visibleName: 'The Best Foo',
			description: 'Bar',
		} as any);
		loadComponentDocs(component);
		await flush();

		const [processed] = processComponents([component], options);
		expect(processed.docsLoaded).toBe(true);
		expect(processed.visibleName).toBe('The Best Foo');
		expect(processed.props?.description).toBe('Bar');
	});

	it('should route a component under its documented name once it is known', async () => {
		const routed = { useRouterLinks: true, hashPath: [] };
		const component = lazyComponent({ displayName: 'FancyFoo' });
		expect(processComponents([component], routed)[0].href).toBe('/#/Foo');

		loadComponentDocs(component);
		await flush();

		const [processed] = processComponents([component], routed);
		expect(processed.name).toBe('FancyFoo');
		expect(processed.href).toBe('/#/FancyFoo');
		// …and the name the links minted before that used still identifies it
		expect(processed.nameFromPath).toBe('Foo');
	});

	it('should render nothing for a component with neither documentation nor a loader', () => {
		expect(processComponents(deepfreeze([{ slug: 'foo' }]), options)).toEqual([{}]);
	});
});
