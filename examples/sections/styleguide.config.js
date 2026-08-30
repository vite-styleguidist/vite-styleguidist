const path = require('path');

module.exports = {
	title: 'React Style Guide Example',
	pagePerSection: true,
	// tocMode: 'collapse',
	sections: [
		{
			name: 'Documentation',
			content: 'docs/Documentation.md',
			sections: [
				{
					name: 'Files',
					content: 'docs/Files.md',
					components: () => ['./src/components/WrappedButton/WrappedButton.js'],
					sections: [
						{
							name: 'First File',
							content: 'docs/One.md',
							description: 'This is the first section description',
							components: () => ['./src/components/Label/Label.js'],
						},
						{
							name: 'Second File',
							content: 'docs/Two.md',
						},
					],
				},
				{
					name: 'Online documentation',
					href: 'https://github.com/styleguidist/react-styleguidist',
					external: true,
				},
			],
			sectionDepth: 2,
		},
		{
			name: 'Components',
			content: 'docs/Components.md',
			sections: [
				{
					name: 'Buttons',
					components: () => [
						'./src/components/Button/Button.js',
						'./src/components/ThemeButton/ThemeButton.js',
					],
					exampleMode: 'expand', // 'hide' | 'collapse' | 'expand'
					usageMode: 'hide', // 'hide' | 'collapse' | 'expand'
				},
				{
					name: 'Fields',
					components: () => ['./src/components/Placeholder/Placeholder.js'],
					exampleMode: 'expand', // 'hide' | 'collapse' | 'expand'
					usageMode: 'expand', // 'hide' | 'collapse' | 'expand'
				},
				{
					name: 'Labels',
					components: () => ['./src/components/MyLabel/Label.js'],
					exampleMode: 'expand', // 'hide' | 'collapse' | 'expand'
					usageMode: 'expand', // 'hide' | 'collapse' | 'expand'
				},
				{
					name: 'Others',
					components: () => ['./src/components/RandomButton/RandomButton.js'],
					exampleMode: 'collapse', // 'hide' | 'collapse' | 'expand'
					usageMode: 'collapse', // 'hide' | 'collapse' | 'expand'
				},
			],
			sectionDepth: 0,
		},
	],
	// Global styles loaded before the style guide itself. Vite imports CSS files
	// natively, so no loader configuration is needed for this to work.
	require: [path.join(__dirname, 'src/styles.css')],
};
