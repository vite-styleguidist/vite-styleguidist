module.exports = {
	components: 'src/components/**/[A-Z]*.js',
	defaultExample: true,
	viteConfig: {
		resolve: {
			// Run everything (your components and Styleguidist’s own UI) on Preact
			// through its React compatibility layer. A string alias also matches
			// sub-paths (`react` matches `react/jsx-runtime`), so the more specific
			// entries have to come first.
			alias: {
				'react/jsx-runtime': 'preact/jsx-runtime',
				'react/jsx-dev-runtime': 'preact/jsx-dev-runtime',
				'react-dom/client': 'preact/compat/client',
				'react-dom': 'preact/compat',
				react: 'preact/compat',
			},
		},
	},
};
