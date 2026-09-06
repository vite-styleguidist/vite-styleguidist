const path = require('path');

module.exports = {
	title: 'Style guide example',
	components: './src/components/**/[A-Z]*.js',
	showSidebar: false,
	// The theme below pins a light `baseBackground`, which opts that one token out of dark
	// mode (see docs/Configuration.md, "Colour tokens and dark mode"), and there is no sidebar
	// so no toggle: force the light scheme, or a visitor with a dark OS would get the dark
	// text colours on this light background.
	colorScheme: 'light',
	// Partial theme: it is deep-merged into Styleguidist’s default theme
	// (see src/client/styles/theme.ts for all the keys)
	theme: {
		color: {
			baseBackground: '#fdfdfc',
			link: '#274e75',
			linkHover: '#90a7bf',
			border: '#e0d2de',
		},
		fontFamily: {
			base: ['Helvetica', 'sans-serif'],
		},
	},
	styles: function styles(theme) {
		return {
			Playground: {
				preview: {
					paddingLeft: 0,
					paddingRight: 0,
					borderWidth: [[0, 0, 1, 0]],
					borderRadius: 0,
				},
			},
			Code: {
				code: {
					// make inline code example appear the same color as links
					color: theme.color.link,
					fontSize: 14,
				},
			},
		};
	},
	getComponentPathLine(componentPath) {
		const name = path.basename(componentPath, '.js');
		return `import { ${name} } from 'my-awesome-library';`;
	},

	// Example of overriding the CLI message in local development.
	// Uncomment/edit the following `serverHost` entry to see in output
	// serverHost: 'your-domain',
	printServerInstructions(config) {
		console.log(`View your styleguide at: http://${config.serverHost}:${config.serverPort}`);
	},

	// Override Styleguidist components. Paths may be extensionless: Vite resolves them
	// the same way as imports, and JSX in these .js files is compiled by Styleguidist.
	styleguideComponents: {
		LogoRenderer: path.join(__dirname, 'styleguide/components/Logo'),
		StyleGuideRenderer: path.join(__dirname, 'styleguide/components/StyleGuide'),
		SectionsRenderer: path.join(__dirname, 'styleguide/components/SectionsRenderer'),
	},

	// Vite handles JSX, CSS Modules (`*.module.css`) and SVG imports natively, so
	// the only thing left to configure is an import alias.
	viteConfig: {
		resolve: {
			alias: {
				// Make sure the example uses the local build of vite-styleguidist: the custom
				// SectionsRenderer deep-imports the default renderer from the package, and when
				// this example is built from the repository root (`npm run build:customised`)
				// it has no node_modules of its own to resolve that package name from.
				// Vite aliases are plain prefix rewrites, so the aliased import bypasses the
				// package's `exports` map; the `.js` extension in SectionsRenderer.js is still
				// needed for the un-aliased path a real consumer takes.
				// This is only for the examples in this repo, you won't need it for your own project.
				'vite-styleguidist': path.join(__dirname, '../../'),
			},
		},
	},
};
