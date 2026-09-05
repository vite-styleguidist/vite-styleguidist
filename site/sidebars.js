// Sidebar for the docs section. Every entry is a doc *id*, which is the URL slug
// (/docs/<id>) and comes from the `<!-- Label #id -->` header comment of the matching
// file in the repo-root docs/ folder (see scripts/docs.js). A doc that is not listed
// here still builds, but is reachable only by direct URL and Docusaurus warns about it.
module.exports = {
	docs: {
		Essentials: [
			'getting-started',
			'documenting',
			'components',
			'thirdparties',
			'vite',
			'cookbook',
		],
		Advanced: [
			'configuration',
			'cli',
			'api',
			'migration',
			'compatibility',
			'development',
			'maintenance',
		],
		Project: ['fork'],
	},
};
