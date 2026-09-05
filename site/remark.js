// Remark plugin: make the relative links in the repo-root docs work on the site.
//
// The docs link to each other as `GettingStarted.md` or `Configuration.md#theme` so that
// they work on GitHub. Here those links become `/docs/<id>` (+ anchor), where the id is
// looked up in the same table scripts/sync.js uses to name the generated files (see
// scripts/docs.js), so a doc whose id differs from its filename still resolves.
//
// Absolute URLs are never touched, even when they end in `.md`. (The previous version
// rewrote any `*.md` URL and had to keep an allowlist of external Markdown links.)

const { kebabCase } = require('lodash');
const { getDocsTable } = require('./scripts/docs');

const RELATIVE_MD_LINK = /^(?:\.\/)?([\w-]+)\.md(#.*)?$/;

const getDocUrl = (url) => {
	const match = url.match(RELATIVE_MD_LINK);
	if (!match) {
		return url;
	}
	const [, name, hash = ''] = match;
	const id = getDocsTable().get(name);
	if (!id) {
		// Not one of docs/*.md (typo, deleted file, or a doc excluded from the site).
		// Fall back to the old filename convention and let Docusaurus's broken-link check
		// report it, rather than failing here with less context.
		console.warn(`remark.js: link to unknown doc "${url}"`);
		return `/docs/${kebabCase(name)}${hash}`;
	}
	return `/docs/${id}${hash}`;
};

// Minimal tree walk; small enough that pulling in unist-util-visit (ESM-only since v3)
// is not worth it from this CommonJS module.
const walk = (node, callback) => {
	callback(node);
	if (node.children) {
		node.children.forEach((child) => walk(child, callback));
	}
};

function link() {
	return (ast) =>
		walk(ast, (node) => {
			// `link` is `[text](url)`, `definition` is the `[label]: url` form.
			if ((node.type === 'link' || node.type === 'definition') && node.url) {
				node.url = getDocUrl(node.url);
			}
		});
}

module.exports = [link];
