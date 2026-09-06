const path = require('path');
const { version } = require('./package');

// Styleguidist uses Vite: JSX in .js files and CSS imports work out of the box,
// no bundler configuration needed. `theme` and `styles` point to ES module files
// (`export default {...}`) that are imported into the browser bundle.
module.exports = {
	// Component globs are case-sensitive: the pattern has to match the real
	// directory name (`src/components`).
	components: 'src/components/**/[A-Z]*.js',
	defaultExample: true,
	moduleAliases: {
		'rsg-example': path.resolve(__dirname, 'src'),
	},
	ribbon: {
		url: 'https://github.com/vite-styleguidist/vite-styleguidist',
	},
	theme: 'styleguide.theme.js',
	styles: 'styleguide.styles.js',
	version,
};
