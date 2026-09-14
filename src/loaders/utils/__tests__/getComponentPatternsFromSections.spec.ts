import getComponentPatternsFromSections from '../getComponentPatternsFromSections.js';

const sections = [
	{
		name: 'Readme',
		content: 'Readme.md',
	},
	{
		name: 'Components',
		components: ['components/**/B*.js'],
	},
	{
		name: 'Nesting',
		sections: [
			{
				name: 'Nested',
				components: ['components/**/P*.js'],
			},
		],
	},
	{
		// A section can carry both, and getSections() processes both, so both are listed
		name: 'Nesting With Components',
		components: ['components/**/T*.js'],
		sections: [
			{
				name: 'Also Nested',
				components: ['components/**/O*.js'],
			},
		],
	},
];

it('should return a list of patterns', () => {
	const result = getComponentPatternsFromSections(sections);
	expect(result).toEqual([
		'components/**/B*.js',
		'components/**/P*.js',
		'components/**/T*.js',
		'components/**/O*.js',
	]);
});

it('should include a string pattern, which the default section keeps as given', () => {
	const result = getComponentPatternsFromSections([
		{ name: 'Default', components: 'src/components/**/[A-Z]*.js' },
	] as any);
	expect(result).toEqual(['src/components/**/[A-Z]*.js']);
});
