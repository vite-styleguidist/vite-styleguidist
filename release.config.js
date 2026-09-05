// semantic-release configuration for vite-styleguidist.
//
// Why a .js file instead of .releaserc.json: JSON cannot carry comments, and the release
// channel model below is exactly the kind of thing a future maintainer will wonder about.
// The package is `"type": "module"`, so this file is native ESM; semantic-release loads it
// through cosmiconfig, which recognises release.config.{js,cjs,mjs} and .releaserc.* alike.
//
// Channel model
// -------------
// - `main` is the stable channel. Every release-worthy commit pushed to it becomes the next
//   1.x.y and lands on npm's default `latest` dist-tag.
// - `next` is the prerelease channel. Commits pushed there become 1.0.0-next.1, 1.0.0-next.2,
//   ... and are published under the `next` dist-tag, so `npm install vite-styleguidist` never
//   picks them up unless the user explicitly asks for `vite-styleguidist@next`. The first
//   publishes of the fork happen here. When `next` is merged into `main`, the accumulated
//   commits are released as one stable version.
//
// Versioning
// ----------
// package.json carries the placeholder "0.0.0-development" permanently: semantic-release derives
// the next version from git tags (`v${version}`) and the commit history, never from package.json,
// and @semantic-release/npm rewrites the field in the CI checkout right before publishing. With no
// tags in the repo the very first version is 1.0.0 (semantic-release's hard-coded first release);
// the "react-styleguidist@13.1.4 -> vite-styleguidist@1.0.0" story is deliberate: the fork starts a
// fresh 1.0 line rather than continuing upstream's numbering. Do not import upstream's tags.
//
// Why nothing is committed back (no @semantic-release/git, no CHANGELOG.md)
// -----------------------------------------------------------------------
// The `main` ruleset requires every change to arrive through a pull request, and GitHub refuses
// to list the GitHub Actions app as a bypass actor on a repository-level ruleset, so a release bot
// cannot push a "chore(release)" commit. Rather than hand a long-lived personal token to CI, the
// release notes live only in GitHub Releases (the @semantic-release/github plugin writes them) and
// the version lives only in git tags and on npm. Readme.md and docs/Maintenance.md point at the
// Releases page accordingly.
//
// Commit conventions
// ------------------
// Conventional Commits, enforced by commitlint.config.js. `fix:` -> patch, `feat:` -> minor,
// `feat!:` or a `BREAKING CHANGE:` footer -> major. Every other type (chore, docs, ci, build,
// refactor, test, style, perf without `!`) does not trigger a release on its own.

export default {
	branches: ['main', { name: 'next', prerelease: true }],
	tagFormat: 'v${version}',
	plugins: [
		['@semantic-release/commit-analyzer', { preset: 'conventionalcommits' }],
		['@semantic-release/release-notes-generator', { preset: 'conventionalcommits' }],
		// Publishes to npm. Authentication is OIDC trusted publishing when the workflow has
		// `id-token: write` and the trusted publisher is configured on npmjs.com; otherwise the
		// plugin falls back to the NPM_TOKEN environment variable. See .github/workflows/release.yml.
		'@semantic-release/npm',
		// Creates the GitHub Release (tag + notes) and comments on the issues/PRs it closes.
		'@semantic-release/github',
	],
};
