import type * as Rsg from '../../typings/index.js';

/**
 * Pick the one example an isolated view (`#!/Button/2`) shows out of a page’s chunk list.
 *
 * The two pipelines number examples differently, and this is the single place that knows it:
 *
 * - a `.md` page is a list of chunks and the index counts prose chunks too, so a Markdown
 *   chunk takes one number each (`machineReadable.ts` copies the same rule for `docs.json`);
 * - an `.mdx` page is a single `{type:'mdx'}` chunk whose prose is one compiled React tree with
 *   no chunk positions to count, so it takes one number per playground and the answer is
 *   `chunk.examples[n]` — a plain code chunk, which `Examples` then renders without any MDX
 *   involved. Isolating one example out of an MDX page therefore shows exactly the same UI as
 *   isolating one out of a Markdown page.
 *
 * A component’s list is the concatenation of its examples file and its `@example` doclet file
 * (see processComponents.ts), which may come from different pipelines, so the numbers are
 * walked rather than indexed: each chunk consumes as many as it owns, and the search stops in
 * the chunk that owns `index`. With a single source that walk lands exactly where the old
 * `examples[index]` / `chunk.examples[index]` did, so pure `.md` and pure `.mdx` pages keep
 * their URLs.
 *
 * Out-of-range indexes keep returning `[undefined]`, the behaviour both callers have always had.
 */
export default function filterExamplesByIndex(
	examples: Rsg.Example[],
	index: number
): Rsg.Example[] {
	// Where the chunk being examined starts in the page’s continuous numbering
	let offset = 0;
	for (const example of examples) {
		if (example.type === 'mdx') {
			if (index >= offset && index < offset + example.examples.length) {
				return [example.examples[index - offset]];
			}
			offset += example.examples.length;
		} else {
			if (index === offset) {
				return [example];
			}
			offset += 1;
		}
	}
	// Out of range (and any negative index): the callers render “example not found”
	return [undefined as unknown as Rsg.Example];
}
