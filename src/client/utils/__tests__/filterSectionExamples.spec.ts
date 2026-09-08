import deepfreeze from 'deepfreeze';
import filterSectionExamples from '../filterSectionExamples.js';

const section = deepfreeze({
	content: ['a', 'b', 'c', 'd'],
	other: 'info',
});

describe('filterSectionExamples', () => {
	it('should return a shallow copy of a section with example filtered by given index', () => {
		const result = filterSectionExamples(section as any, 2);
		expect(result).toEqual({
			content: ['c'],
			other: 'info',
		});
	});
});

describe('filterSectionExamples with an mdx page', () => {
	const mdxSection = deepfreeze({
		content: [
			{
				type: 'mdx',
				Content: () => null,
				examples: ['a', 'b', 'c'].map((x) => ({ type: 'code', content: x })),
			},
		],
		other: 'info',
	});

	it('should return the nth playground of the page', () => {
		const result = filterSectionExamples(mdxSection as any, 2);

		expect(result.content).toEqual([{ type: 'code', content: 'c' }]);
	});
});
