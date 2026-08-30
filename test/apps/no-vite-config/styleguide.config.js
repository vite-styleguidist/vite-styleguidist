// A project without a vite.config.* file next to the style guide config:
// Styleguidist must fall back to its own Vite config only.
module.exports = {
	title: 'React Style Guide Example',
	components: './components/**/[A-Z]*.js',
};
