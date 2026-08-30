// The repository root package.json has `"type": "module"`, so this config file
// is an ES module (Styleguidist loads config files with `require()`, which
// supports ESM on the Node versions we target).
import path from 'node:path';

export default {
	title: 'React Style Guide Example',
	defaultExample: true,
	components: './components/**/[A-Z]*.js',
	viteConfig: {
		resolve: {
			alias: {
				components: path.resolve(import.meta.dirname, 'lib'),
			},
		},
	},
};
