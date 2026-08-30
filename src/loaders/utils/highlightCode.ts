import createLogger from 'glogg';
import Prism from 'prismjs';

import 'prismjs/components/prism-clike.js';
import 'prismjs/components/prism-markup.js';
import 'prismjs/components/prism-markdown.js';
import 'prismjs/components/prism-css.js';
import 'prismjs/components/prism-css-extras.js';
import 'prismjs/components/prism-scss.js';
import 'prismjs/components/prism-less.js';
import 'prismjs/components/prism-javascript.js';
import 'prismjs/components/prism-flow.js';
import 'prismjs/components/prism-typescript.js';
import 'prismjs/components/prism-jsx.js';
import 'prismjs/components/prism-tsx.js';
import 'prismjs/components/prism-graphql.js';
import 'prismjs/components/prism-json.js';
import 'prismjs/components/prism-bash.js';
import 'prismjs/components/prism-diff.js';

const logger = createLogger('rsg');

const IGNORED_LANGUAGES = ['extend', 'insertBefore', 'DFS'];
const getLanguages = () =>
	Object.keys(Prism.languages).filter((x) => !IGNORED_LANGUAGES.includes(x));

/**
 * Highlight code.
 *
 * @param {string} code
 * @param {string} lang
 * @returns {string}
 */
export default function highlightCode(code: string, lang?: string): string {
	if (!lang) {
		return code;
	}

	const grammar = Prism.languages[lang];
	if (!grammar) {
		logger.warn(
			`Syntax highlighting for “${lang}” isn’t supported. Supported languages are: ${getLanguages().join(
				', '
			)}.`
		);
		return code;
	}

	return Prism.highlight(code, grammar, lang);
}
