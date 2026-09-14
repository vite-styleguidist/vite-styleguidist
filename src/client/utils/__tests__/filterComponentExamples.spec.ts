import deepfreeze from 'deepfreeze';
import filterComponentExamples from '../filterComponentExamples.js';
import type * as Rsg from '../../../typings/index.js';

const examples: Rsg.Example[] = ['a', 'b', 'c', 'd'].map((x) => ({ type: 'markdown', content: x }));

const component = deepfreeze({
	props: {
		examples,
	},
	other: 'info',
});

describe('filterComponentExamples', () => {
	it('should return a shallow copy of a component with example filtered by given index', () => {
		const result = filterComponentExamples(component, 2);
		expect(result).toEqual({
			props: {
				examples: [{ type: 'markdown', content: 'c' }],
			},
			other: 'info',
		});
	});
});

describe('filterComponentExamples with an mdx page', () => {
	// An `.mdx` page is one chunk holding every playground, so the index is the ordinal of the
	// playground and the isolated view gets a plain code chunk out of it
	const mdxComponent = deepfreeze({
		props: {
			examples: [
				{
					type: 'mdx',
					Content: () => null,
					examples: ['a', 'b', 'c'].map((x) => ({ type: 'code', content: x })),
				},
			] as unknown as Rsg.Example[],
		},
		other: 'info',
	});

	it('should return the nth playground of the page', () => {
		const result = filterComponentExamples(mdxComponent as any, 1);

		expect(result.props?.examples).toEqual([{ type: 'code', content: 'b' }]);
	});

	// `lazyDocs` (ADR 0019): every index is out of range for a component that has no
	// examples *yet*, and “example not found” is not what it should render
	it('should leave a component whose documentation is not loaded alone', () => {
		const lazy = deepfreeze({
			nameFromPath: 'Button',
			docsLoaded: false,
			loadDocs: () => Promise.resolve({ props: {} }),
			props: { examples: [] as Rsg.Example[] },
		});

		expect(filterComponentExamples(lazy as any, 1)).toBe(lazy);
	});
});
