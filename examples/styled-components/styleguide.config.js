const path = require('path');
const { version } = require('./package');

// Styleguidist uses Vite, which compiles TypeScript/TSX natively: no Babel
// presets or loaders are needed for the components or for the custom Wrapper.
module.exports = {
	components: 'src/components/**/*.{js,tsx}',
	styleguideComponents: {
		// Extensionless path: Vite resolves it to StyleGuideWrapper.tsx
		Wrapper: path.join(__dirname, 'src/StyleGuideWrapper'),
	},
	defaultExample: true,
	moduleAliases: {
		'rsg-example': path.resolve(__dirname, 'src'),
	},
	usageMode: 'expand',
	version,
};
