import filterExamplesByIndex from '../filterExamplesByIndex.js';
import type * as Rsg from '../../../typings/index.js';

const md = (content: string): Rsg.Example => ({ type: 'markdown', content });
const code = (content: string): Rsg.Example =>
	({ type: 'code', content }) as unknown as Rsg.Example;
const mdx = (...contents: string[]): Rsg.Example =>
	({
		type: 'mdx',
		Content: () => null,
		examples: contents.map((content) => ({ type: 'code', content })),
	}) as unknown as Rsg.Example;

/** What every index of a page resolves to, so a whole numbering can be asserted at once. */
const resolve = (examples: Rsg.Example[], count: number): (string | undefined)[] =>
	Array.from({ length: count }, (_, index) => {
		const [example] = filterExamplesByIndex(examples, index);
		return example && 'content' in example ? example.content : undefined;
	});

describe('filterExamplesByIndex', () => {
	// A `.md` page: one number per chunk, prose included
	const markdownPage = [md('intro'), code('a'), md('mid'), code('b')];

	it('should count every chunk of a markdown page', () => {
		expect(resolve(markdownPage, 5)).toEqual(['intro', 'a', 'mid', 'b', undefined]);
	});

	it('should return [undefined] for an out-of-range or negative index', () => {
		expect(filterExamplesByIndex(markdownPage, 9)).toEqual([undefined]);
		expect(filterExamplesByIndex(markdownPage, -1)).toEqual([undefined]);
		expect(filterExamplesByIndex([], 0)).toEqual([undefined]);
	});

	// An `.mdx` page is a single chunk: one number per playground, none for its prose
	const mdxPage = [mdx('a', 'b', 'c')];

	it('should count the playgrounds of a lone mdx page', () => {
		expect(resolve(mdxPage, 4)).toEqual(['a', 'b', 'c', undefined]);
	});

	// A component whose examples come from two sources: its examples file and its
	// `@example ./x.mdx` doclet (see processComponents.ts). The numbers run continuously
	// across them, which is what machineReadable.ts writes into docs.json.
	describe('a component mixing a markdown page and an mdx page', () => {
		it('should continue into the mdx page after the markdown chunks', () => {
			const examples = [...markdownPage, mdx('x', 'y')];
			expect(resolve(examples, 7)).toEqual(['intro', 'a', 'mid', 'b', 'x', 'y', undefined]);
		});

		it('should continue into the markdown chunks after the mdx page', () => {
			const examples = [mdx('x', 'y'), ...markdownPage];
			expect(resolve(examples, 7)).toEqual(['x', 'y', 'intro', 'a', 'mid', 'b', undefined]);
		});

		it('should give an mdx page with no playground no numbers at all', () => {
			const examples = [mdx(), ...markdownPage];
			expect(resolve(examples, 5)).toEqual(['intro', 'a', 'mid', 'b', undefined]);
		});
	});
});
