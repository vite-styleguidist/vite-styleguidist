const path = require('path');
const { version } = require('./package');

// Styleguidist uses Vite: JSX in .js files, CSS imports and static assets work
// out of the box, no bundler configuration needed.
module.exports = {
	components: 'src/components/**/[A-Z]*.js',
	defaultExample: true,
	moduleAliases: {
		'rsg-example': path.resolve(__dirname, 'src'),
	},
	ribbon: {
		url: 'https://github.com/vite-styleguidist/vite-styleguidist',
	},
	version,
};
