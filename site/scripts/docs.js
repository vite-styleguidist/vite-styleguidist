/**
 * How the repo-root `docs/*.md` files map to pages of this site.
 *
 * The repo-root `docs/` folder is the single source of truth for the documentation, and
 * it must stay readable as plain Markdown on GitHub. So instead of Docusaurus front
 * matter, the site derives page metadata from two conventions inside each file:
 *
 * 1. TITLE — the first ATX H1 (`# Title`) becomes the page title. It is stripped from the
 *    generated body because Docusaurus renders the title from front matter.
 *
 * 2. SIDEBAR LABEL + ID — an optional HTML comment on the very FIRST line,
 *
 *        <!-- Sidebar label #page-id -->
 *
 *    gives the short label used in the sidebar and the page *id*, which is also the URL
 *    slug (`/docs/<id>`) and the name of the generated file (`site/docs/<id>.md`).
 *    Without the comment, the label falls back to the H1 text and the id to
 *    `kebabCase(H1)`. The comment is removed from the generated body: MDX 3 does not
 *    accept HTML comments.
 *
 * `scripts/sync.js` (writes the generated files) and `remark.js` (rewrites relative
 * `Foo.md` links to `/docs/<id>`) both resolve through `getDocsTable()` below, so a doc
 * whose id differs from `kebabCase(filename)` (e.g. `Theming.md` with `#theme`) still
 * links correctly. Keep the two in sync by only ever changing this file.
 *
 * `docs/Readme.md` is intentionally excluded: it is GitHub's index of the docs folder,
 * and the site's landing page plus sidebar play that role here. Including it would only
 * produce an orphan page.
 */

const { readdirSync, readFileSync } = require('node:fs');
const path = require('node:path');
const { kebabCase } = require('lodash');

// The repo-root docs/ folder by default. `DOCS_DIR=/path/to/docs` overrides it, which
// lets you build the site against another checkout's docs (e.g. a release branch)
// without moving files around.
const DOCS_DIR = process.env.DOCS_DIR
	? path.resolve(process.env.DOCS_DIR)
	: path.resolve(__dirname, '..', '..', 'docs');

const EXCLUDED_FILES = new Set(['Readme.md']);

const TITLE_REGEX = /^#\s+(.*?)\s*$/m;
// No `m` flag on purpose: the comment must be the first thing in the file. The trailing
// `[ \t]*\r?\n?` swallows the line break so stripping it leaves no blank line behind.
const HEADER_COMMENT_REGEX = /^<!--\s*(.*?)(?:\s*#([\w-]+))?\s*-->[ \t]*\r?\n?/;

/**
 * Derive a page's metadata from a source doc.
 *
 * @param {string} filename e.g. `GettingStarted.md`
 * @param {string} contents
 */
function parseDoc(filename, contents) {
	const name = path.basename(filename, '.md');
	const [, title] = contents.match(TITLE_REGEX) || [];
	if (!title) {
		throw new Error(`docs/${filename} has no H1 title (a line starting with "# ")`);
	}
	const [headerComment = '', sidebarLabel = title, customId] =
		contents.match(HEADER_COMMENT_REGEX) || [];
	const id = customId || kebabCase(sidebarLabel);
	return { filename, name, id, title, sidebarLabel, headerComment, contents };
}

/** All docs, parsed, in filename order. */
function listDocs() {
	return readdirSync(DOCS_DIR)
		.filter((filename) => filename.endsWith('.md') && !EXCLUDED_FILES.has(filename))
		.sort()
		.map((filename) => parseDoc(filename, readFileSync(path.join(DOCS_DIR, filename), 'utf8')));
}

let table;

/**
 * Map from source name (filename without `.md`, e.g. `GettingStarted`) to page id
 * (e.g. `getting-started`). Memoized: remark.js calls it for every link.
 *
 * @returns {Map<string, string>}
 */
function getDocsTable() {
	if (!table) {
		table = new Map();
		for (const doc of listDocs()) {
			for (const [name, id] of table) {
				if (id === doc.id) {
					throw new Error(`docs/${doc.filename} and docs/${name}.md both have the id "${id}"`);
				}
			}
			table.set(doc.name, doc.id);
		}
	}
	return table;
}

// Where relative links that leave the synced docs (`../SECURITY.md`, `../src/...`,
// `decisions/0001-...md`) are sent on the site. They stay relative in the source so that
// GitHub resolves them; the site cannot, so remark.js turns them into repository URLs.
const REPO_URL = 'https://github.com/vite-styleguidist/vite-styleguidist';
// Out-of-docs links (source files, .github/*) point at the branch the site is built from:
// site.yml deploys both main and next, and a page built from next may link to files that
// only exist there. GITHUB_REF_NAME is the pushed branch in CI (`<n>/merge` on pull
// requests, hence the allow-list); local builds link to main.
const DEPLOY_BRANCHES = ['main', 'next'];
const REPO_BRANCH = DEPLOY_BRANCHES.includes(process.env.GITHUB_REF_NAME)
	? process.env.GITHUB_REF_NAME
	: 'main';

module.exports = { DOCS_DIR, REPO_URL, REPO_BRANCH, parseDoc, listDocs, getDocsTable };
