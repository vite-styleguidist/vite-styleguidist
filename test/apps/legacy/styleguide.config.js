// A style guide config as it looked under react-styleguidist 13, with one of every kind of
// problem `styleguidist doctor` reports: removed webpack options, deprecated options, a
// mistyped option name, an option whose value has the wrong type and one that was replaced.
module.exports = {
	components: 'components/**/[A-Z]*.js',
	webpackConfig: {
		module: { rules: [] },
	},
	updateWebpackConfig: (config) => config,
	dangerouslyUpdateWebpackConfig: (config) => config,
	editorConfig: {
		theme: 'base16-light',
	},
	showCode: true,
	showUsage: true,
	styleguidComponents: {
		Wrapper: 'components/Wrapper',
	},
	skipComponentsWithoutExample: 'yes',
	theme: 'theme.js',
	styles: 'styles.js',
	require: ['./setup.js'],
};
