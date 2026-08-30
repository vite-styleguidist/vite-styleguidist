import path from 'node:path';
import getComponentFilesFromSections from '../getComponentFilesFromSections.js';

const configDir = path.resolve(import.meta.dirname, '../../../../test');
const sections = [
	{
		name: 'Readme',
		content: 'Readme.md',
	},
	{
		name: 'Components',
		components: 'components/**/B*.js',
	},
	{
		name: 'Nesting',
		sections: [
			{
				name: 'Nested',
				components: 'components/**/P*.js',
			},
		],
	},
];

// Mask the absolute test directory as `~` (always with forward slashes) to keep the expectations portable
const deabs = (files: string[]) =>
	files.map((file) => `~/${path.relative(configDir, file).split(path.sep).join('/')}`);

it('getComponentFilesFromSections() should return a list of files', () => {
	const result = getComponentFilesFromSections(sections, configDir);
	expect(deabs(result)).toEqual([
		'~/components/Button/Button.js',
		'~/components/Placeholder/Placeholder.js',
		'~/components/Price/Price.js',
	]);
});

it('getComponentFilesFromSections() should ignore specified patterns', () => {
	const result = getComponentFilesFromSections(sections, configDir, ['**/*Button*']);
	expect(deabs(result)).toEqual([
		'~/components/Placeholder/Placeholder.js',
		'~/components/Price/Price.js',
	]);
});
