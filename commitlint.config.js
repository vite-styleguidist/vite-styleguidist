// Commit message convention: Conventional Commits (https://www.conventionalcommits.org).
//
// Enforced in two places:
// - locally, by the .husky/commit-msg hook (every `git commit`);
// - in CI, by the `pr-title` job in .github/workflows/ci.yml. Pull requests are squash-merged,
//   which turns the PR *title* into the commit that semantic-release reads, so the title is what
//   actually decides whether a release happens and which version it gets.
//
// release.config.js documents how the types map to version bumps.
export default {
	extends: ['@commitlint/config-conventional'],
	rules: {
		// Lowercase subjects: `fix: handle empty sections`, not `fix: Handle empty sections`.
		// This is the config-conventional default, spelled out because the upstream convention
		// capitalised subjects and people may still have it in muscle memory. Only the casing
		// *style* of the whole subject is checked, so proper nouns (Vite, React) are fine.
		'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
		'header-max-length': [2, 'always', 100],
		// URLs and `Co-Authored-By:` trailers routinely exceed 100 characters and cannot be wrapped;
		// warn instead of rejecting the commit.
		'body-max-line-length': [1, 'always', 100],
		'footer-max-line-length': [1, 'always', 100],
	},
};
