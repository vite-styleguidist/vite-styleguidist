// CommonJS config file (this fixture app has no `"type": "module"` in its package.json)
// with a user Vite config, merged into the one Styleguidist generates.
const path = require('path');

module.exports = {
	title: 'React Style Guide Example',
	defaultExample: true,
	components: './components/**/[A-Z]*.js',
	viteConfig: {
		resolve: {
			alias: {
				components: path.resolve(__dirname, 'lib'),
			},
		},
	},
};
