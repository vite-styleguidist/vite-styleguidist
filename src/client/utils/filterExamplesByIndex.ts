import type * as Rsg from '../../typings/index.js';

/**
 * Pick the one example an isolated view (`#!/Button/2`) shows out of a page’s chunk list.
 *
 * The two pipelines number examples differently, and this is the single place that knows it:
 *
 * - a `.md` page is a list of chunks and the index counts prose chunks too, so
 *   `chunks[index]` is the answer (`machineReadable.ts` copies the same rule for `docs.json`);
 * - an `.mdx` page is a single `{type:'mdx'}` chunk whose prose is one compiled React tree with
 *   no chunk positions to count, so the index is the ordinal of the playground and the answer
 *   is `chunk.examples[index]` — a plain code chunk, which `Examples` then renders without any
 *   MDX involved. Isolating one example out of an MDX page therefore shows exactly the same UI
 *   as isolating one out of a Markdown page.
 *
 * Out-of-range indexes keep returning `[undefined]`, the behaviour both callers have always had.
 */
export default function filterExamplesByIndex(
	examples: Rsg.Example[],
	index: number
): Rsg.Example[] {
	const [first] = examples;
	if (examples.length === 1 && first && first.type === 'mdx') {
		return [first.examples[index]];
	}
	return [examples[index]];
}
