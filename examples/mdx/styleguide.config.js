const path = require('path');
const { version } = require('./package');

// MDX is opt-in and needs two extra dev dependencies (`@mdx-js/mdx` and `remark-gfm`, see
// package.json). Nothing else in this config is MDX-specific: an `.mdx` file is discovered
// and rendered because of its extension, so `Readme.mdx` next to a component and an `.mdx`
// path in `sections[].content` are all it takes.
module.exports = {
	title: 'Vite Styleguidist MDX Example',
	moduleAliases: {
		'rsg-example': path.resolve(__dirname, 'src'),
	},
	// Components every `.mdx` page can use as a JSX element without importing it. Values are
	// module paths, relative to this file or absolute; `docs/Intro.mdx` uses `<Callout/>` on
	// the strength of this line alone, while the two component pages import it themselves.
	mdxComponents: {
		Callout: 'src/docs/Callout',
	},
	sections: [
		{
			name: 'Introduction',
			// A section page written in MDX; the same key accepts a `.md` file.
			content: 'docs/Intro.mdx',
		},
		{
			name: 'Components',
			components: 'src/components/**/[A-Z]*.js',
		},
	],
	ribbon: {
		url: 'https://github.com/vite-styleguidist/vite-styleguidist',
	},
	version,
};
