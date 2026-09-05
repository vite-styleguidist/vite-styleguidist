// Generate site/docs/*.md (gitignored) from the repo-root docs/*.md.
//
// Run as `npm run sync` from site/, before `docusaurus start|build`. The conventions
// (title from the H1, sidebar label and id from the leading `<!-- Label #id -->`
// comment, Readme.md excluded) are documented in ./docs.js, which is also what
// remark.js uses to rewrite links, so the two can never disagree.
//
// Besides adding front matter, this script adapts GitHub-flavoured Markdown to MDX 3:
// - the header comment is removed (MDX rejects HTML comments),
// - `> **Tip:** text` blockquotes become `:::tip` admonitions,
// - `<br>` becomes `<br />` (MDX needs self-closing void elements),
// - the H1 is removed (Docusaurus renders the title from front matter).

const { rmSync, mkdirSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const { listDocs } = require('./docs');

const DEST_DIR = path.resolve(__dirname, '..', 'docs');

const REPO_URL = 'https://github.com/vite-styleguidist/vite-styleguidist';
const EDIT_BRANCH = 'main';

// GitHub-style "> **Word:** text" callouts to Docusaurus admonitions. Docusaurus 3 has
// five types (note, tip, info, warning, danger); `caution` still works but is deprecated
// and logs a warning on every build, so it is mapped to `warning` here.
const ADMONITIONS = {
	note: 'note',
	tip: 'tip',
	info: 'info',
	warning: 'warning',
	caution: 'warning',
	danger: 'danger',
};

const markdownToDocusaurus = (contents) =>
	contents.replace(/^>\s*\*\*(\w+):\*\*\s*(.*?)$/gm, (line, word, text) => {
		const type = ADMONITIONS[word.toLowerCase()];
		// Unknown words (e.g. "> **Example:**") stay ordinary blockquotes.
		return type ? `:::${type}\n${text}\n:::` : line;
	});

const htmlToXml = (contents) => contents.replace(/<br>/g, '<br />');

const stripTitle = (contents) => contents.replace(/^#\s+.*$/m, '');

const stripHeaderComment = (contents, headerComment) =>
	headerComment ? contents.replace(headerComment, '') : contents;

const getEditUrl = (filename) => `${REPO_URL}/edit/${EDIT_BRANCH}/docs/${filename}`;

// JSON.stringify produces a valid YAML double-quoted scalar, so titles containing
// ":" or "#" (which would otherwise break the front matter) are safe.
const yaml = (value) => JSON.stringify(value);

const template = ({ id, title, sidebarLabel, filename, headerComment, contents }) => `---
id: ${id}
title: ${yaml(title)}
sidebar_label: ${yaml(sidebarLabel)}
custom_edit_url: ${getEditUrl(filename)}
---

${stripTitle(htmlToXml(markdownToDocusaurus(stripHeaderComment(contents, headerComment))))}`;

rmSync(DEST_DIR, { recursive: true, force: true });
mkdirSync(DEST_DIR, { recursive: true });

console.log('Syncing docs...');

for (const doc of listDocs()) {
	console.log(`👉 docs/${doc.filename} -> ${doc.id}`);
	writeFileSync(path.join(DEST_DIR, `${doc.id}.md`), template(doc));
}
