// Every URL the shipped product prints at runtime lives here: CLI error output,
// config validation messages, the welcome and example-placeholder screens, the
// client-side error boundary and the footer of every generated style guide all
// import from this file, so the project's identity is changed in one place.
//
// Vite Styleguidist is a maintained fork of React Styleguidist. These used to
// point at react-styleguidist.js.org and styleguidist/react-styleguidist, where a
// bug report from a user of this package would never be triaged.

const REPO = 'https://github.com/vite-styleguidist/vite-styleguidist';

// The docs site: GitHub Pages of this repository (see site/ and .github/workflows/site.yml).
// Every consumer imports these constants instead of spelling out a URL, so moving the site
// (for example to a js.org subdomain) is a change to this file only. The site is built with
// trailingSlash: true, so the page URLs end in "/" and anchors follow.
const SITE = 'https://vite-styleguidist.github.io/vite-styleguidist/';
const DOCS = `${SITE}docs`;

/** Target of the "Created with …" link in the footer of every generated style guide. */
export const HOMEPAGE = SITE;

/** Where the client-side error boundary sends people to report a crash. */
export const BUGS = `${REPO}/issues`;

// Consumers append `#anchor` slugs to these, e.g. the CLI appends `#<option>` (lowercased)
// when a config option fails validation. Docusaurus derives heading ids the same way GitHub
// does (lowercased, backticks stripped), so the `## \`template\`` heading of the
// configuration page is reachable as `#template`.
export const DOCS_CONFIG = `${DOCS}/configuration/`;
export const DOCS_COMPONENTS = `${DOCS}/components/`;
export const DOCS_VITE = `${DOCS}/vite/`;
export const DOCS_DOCUMENTING = `${DOCS}/documenting/`;
export const DOCS_THIRDPARTIES = `${DOCS}/thirdparties/`;
export const DOCS_MIGRATION = `${DOCS}/migration/`;
export const DOCS_COMPATIBILITY = `${DOCS}/compatibility/`;
