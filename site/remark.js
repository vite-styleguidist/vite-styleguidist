// Remark plugin: make the relative links in the repo-root docs work on the site.
//
// The docs link to each other as `GettingStarted.md` or `Configuration.md#theme` so that
// they work on GitHub. Here those links become `/docs/<id>` (+ anchor), where the id is
// looked up in the same table scripts/sync.js uses to name the generated files (see
// scripts/docs.js), so a doc whose id differs from its filename still resolves.
//
// Relative links that leave the synced docs (`../SECURITY.md`, `../src/vite`,
// `decisions/0003-....md`) are equally valid on GitHub but have no page here, so they are
// rewritten to the repository on GitHub: `blob/` for files, `tree/` for directories.
//
// Absolute URLs, anchors and mailto: links are never touched, even when they end in
// `.md`. (The previous version rewrote any `*.md` URL and had to keep an allowlist of
// external Markdown links.)

const { existsSync, statSync } = require('node:fs');
const path = require('node:path');
const { DOCS_DIR, REPO_URL, REPO_BRANCH, getDocsTable } = require('./scripts/docs');

const RELATIVE_MD_LINK = /^(?:\.\/)?([\w-]+)\.md(#.*)?$/;
const EXTERNAL_LINK = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\/)/i;

const REPO_ROOT = path.resolve(DOCS_DIR, '..');

// `../src/vite` -> https://github.com/<org>/<repo>/tree/main/src/vite
const getRepoUrl = (url) => {
	const [target, hash = ''] = url.split(/(?=#)/);
	const absolute = path.resolve(DOCS_DIR, target);
	const relative = path.relative(REPO_ROOT, absolute).split(path.sep).join('/');
	if (relative.startsWith('..')) {
		// Escapes the repository: leave it alone and let the broken-link check report it.
		return url;
	}
	const isDirectory = existsSync(absolute) && statSync(absolute).isDirectory();
	return `${REPO_URL}/${isDirectory ? 'tree' : 'blob'}/${REPO_BRANCH}/${relative}${hash}`;
};

const getDocUrl = (url) => {
	if (EXTERNAL_LINK.test(url)) {
		return url;
	}
	const match = url.match(RELATIVE_MD_LINK);
	if (!match) {
		return getRepoUrl(url);
	}
	const [, name, hash = ''] = match;
	const id = getDocsTable().get(name);
	if (!id) {
		// A sibling Markdown file that is not a site page (excluded, e.g. Readme.md).
		return getRepoUrl(url);
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
