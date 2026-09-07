const { version } = require('./package');

// No `propsParser` here on purpose: the default parser (react-docgen) reads the type
// annotations of these `.tsx` files as they are written, and Vite compiles TypeScript
// with no configuration of its own. That is the whole setup for components you own.
//
// The other road — react-docgen-typescript, for components re-exported from another
// package — is described in Readme.md and spelled out as a copy-paste recipe in
// docs/Cookbook.md. See decision 0017 for the measurements behind that split.
module.exports = {
	title: 'Vite Styleguidist TypeScript Example',
	components: 'src/components/**/[A-Z]*.tsx',
	version,
};
