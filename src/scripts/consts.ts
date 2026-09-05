// Every URL the shipped product prints at runtime lives here: CLI error output,
// config validation messages, the welcome and example-placeholder screens, the
// client-side error boundary and the footer of every generated style guide all
// import from this file, so the project's identity is changed in one place.
//
// Vite Styleguidist is a maintained fork of React Styleguidist. These used to
// point at react-styleguidist.js.org and styleguidist/react-styleguidist, where a
// bug report from a user of this package would never be triaged.

const REPO = 'https://github.com/vite-styleguidist/vite-styleguidist';

// The docs site is not live yet, so the docs constants link to the Markdown
// files in the repository, which GitHub renders. Once the site ships (planned at
// https://vite-styleguidist.github.io/vite-styleguidist/) the site work flips
// HOMEPAGE and DOCS to the site URLs; nothing else needs to change because every
// consumer imports these constants instead of spelling out a URL.
const DOCS = `${REPO}/blob/main/docs`;

/** Target of the "Created with …" link in the footer of every generated style guide. */
export const HOMEPAGE = REPO;

/** Where the client-side error boundary sends people to report a crash. */
export const BUGS = `${REPO}/issues`;

// Consumers append GitHub-style `#anchor` slugs to these, e.g. the CLI appends
// `#<option>` (lowercased) when a config option fails validation. GitHub also
// lowercases heading slugs and strips backticks, so the `## \`template\`` heading in
// Configuration.md is reachable as `#template`.
export const DOCS_CONFIG = `${DOCS}/Configuration.md`;
export const DOCS_COMPONENTS = `${DOCS}/Components.md`;
export const DOCS_VITE = `${DOCS}/Vite.md`;
export const DOCS_DOCUMENTING = `${DOCS}/Documenting.md`;
export const DOCS_THIRDPARTIES = `${DOCS}/Thirdparties.md`;
