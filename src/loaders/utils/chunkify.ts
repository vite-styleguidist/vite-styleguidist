import { remark } from 'remark';
import { visit } from 'unist-util-visit';
import highlightCode from './highlightCode.js';
import parseExample, { ExampleError } from './parseExample.js';
import type * as Rsg from '../../typings/index.js';

// Fence languages rendered as a live playground; anything else is only highlighted.
// Only the first word of a fence's info string ends up here: remark splits
// a ```typescript jsx fence into lang "typescript" and meta "jsx", and parseExample turns
// the meta into modifiers. So the two-word fences WebStorm emits ("typescript jsx",
// "javascript jsx"; upstream issue #1540) are already covered by "typescript" and
// "javascript" — adding the two-word strings to this list would never match.
const PLAYGROUND_LANGS = ['javascript', 'js', 'jsx', 'typescript', 'ts', 'tsx'];
const CODE_PLACEHOLDER = '<%{#code#}%>';

// The `[x]` / `[ ]` marker that opens a GFM task list item.
const GFM_TASK_MARKER = /^\[([ xX])\](\s)/;

/**
 * Keep GFM task list markers (`- [x] Coffee`) intact through the remark round trip.
 *
 * `chunkify` re-serialises the Markdown it parsed so it can splice the playground
 * placeholders back in, and remark-stringify escapes a `[` that opens a list item's text
 * (there it could start a link reference) — turning `- [x] Coffee` into `* \[x] Coffee`.
 * markdown-to-jsx then sees an escaped bracket instead of a task marker and renders the
 * literal text, so the Checkbox override never fires and the docs showcase is broken.
 *
 * Splitting the marker into its own `html` node fixes that without a new dependency:
 * remark-stringify emits `html` nodes verbatim, so the two characters survive unescaped
 * while the rest of the item stays ordinary Markdown. (Adding `remark-gfm` would also fix
 * it — remark would then model the item as `listItem.checked` — but that changes how the
 * whole pipeline parses tables, autolinks, strikethrough and footnotes, which is a much
 * bigger change than this bug needs.)
 */
function preserveTaskMarkers(ast: any) {
	visit(ast, 'listItem', (item: any) => {
		const paragraph = item.children?.[0];
		if (paragraph?.type !== 'paragraph') {
			return;
		}
		const text = paragraph.children?.[0];
		if (text?.type !== 'text') {
			return;
		}
		const match = GFM_TASK_MARKER.exec(text.value);
		if (!match) {
			return;
		}
		text.value = text.value.slice(match[0].length - match[2].length);
		paragraph.children.unshift({ type: 'html', value: `[${match[1]}]` });
	});
}

function isErrorExample(example: any): example is ExampleError {
	return !!example.error;
}

/**
 * Separate Markdown and code examples that should be rendered as a playground in a style guide.
 *
 * @param {string} markdown
 * @param {Function} updateExample
 * @param {Array<string>} playgroundLangs
 * @returns {Array}
 */
export default function chunkify(
	markdown: string,
	updateExample?: (example: Omit<Rsg.CodeExample, 'type'>) => Omit<Rsg.CodeExample, 'type'>,
	playgroundLangs = PLAYGROUND_LANGS
): (Rsg.CodeExample | Rsg.MarkdownExample)[] {
	const codeChunks: Rsg.CodeExample[] = [];

	/*
	 * - Highlight code in fenced code blocks with defined language (```html).
	 * - Extract indented and fenced code blocks with lang javascript|js|jsx or if lang is not defined.
	 * - Leave all other Markdown or HTML as is.
	 */
	function processCode() {
		return (ast: any) => {
			preserveTaskMarkers(ast);
			visit(ast, 'code', (node: any) => {
				const example = parseExample(node.value, node.lang, node.meta, updateExample);

				if (isErrorExample(example)) {
					node.lang = undefined;
					node.value = example.error;
					return;
				}

				const lang = example.lang;
				node.lang = lang;
				if (
					!lang ||
					(playgroundLangs.indexOf(lang) !== -1 && !(example.settings && example.settings.static))
				) {
					codeChunks.push({
						type: 'code',
						content: example.content,
						settings: example.settings,
						// The browser compiles every playground the same way, but the machine-readable
						// docs write the fence back (```jsx / ```tsx), so the language is kept
						...(lang ? { lang } : {}),
					});
					node.type = 'html';
					node.value = CODE_PLACEHOLDER;
				} else {
					node.meta = null;
					node.value = highlightCode(example.content, lang);
				}
			});
		};
	}

	const rendered = remark().use(processCode).processSync(markdown).toString();

	const chunks: (Rsg.CodeExample | Rsg.MarkdownExample)[] = [];
	const textChunks = rendered.split(CODE_PLACEHOLDER);
	textChunks.forEach((chunk) => {
		chunk = chunk.trim();
		if (chunk) {
			chunks.push({
				type: 'markdown',
				content: chunk,
			});
		}
		const code = codeChunks.shift();
		if (code) {
			chunks.push(code);
		}
	});

	return chunks;
}
