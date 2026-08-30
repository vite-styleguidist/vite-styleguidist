import path from 'node:path';
import getComponentFiles from '../getComponentFiles.js';

const configDir = path.resolve(import.meta.dirname, '../../../../test');
const components = ['components/Annotation/Annotation.js', 'components/Button/Button.js'];
const processedComponents = components.map((c) => `~/${c}`);
const glob = 'components/**/[A-Z]*.js';
const globArray = ['components/Annotation/[A-Z]*.js', 'components/Button/[A-Z]*.js'];

// Mask the absolute test directory as `~` (always with forward slashes) to keep the expectations portable
const deabs = (files: string[]) =>
	files.map((file) => `~/${path.relative(configDir, file).split(path.sep).join('/')}`);

it('getComponentFiles() should return an empty array if components is null', () => {
	const result = getComponentFiles();
	expect(result).toEqual([]);
});

it('getComponentFiles() should accept components as a function that returns file names', () => {
	const result = getComponentFiles(() => components, configDir);
	expect(deabs(result)).toEqual(processedComponents);
});

it('getComponentFiles() should accept components as a function that returns absolute paths', () => {
	const absolutize = (files: string[]) => files.map((file) => path.join(configDir, file));
	const result = getComponentFiles(() => absolutize(components), configDir);
	expect(deabs(result)).toEqual(processedComponents);
});

it('getComponentFiles() should accept components as a function that returns globs', () => {
	const result = getComponentFiles(() => globArray, configDir);
	expect(deabs(result)).toEqual([
		'~/components/Annotation/Annotation.js',
		'~/components/Button/Button.js',
	]);
});

it('getComponentFiles() should accept components as an array of file names', () => {
	const result = getComponentFiles(components, configDir);
	expect(deabs(result)).toEqual(processedComponents);
});

it('getComponentFiles() should accept components as an array of absolute paths', () => {
	const absolutize = (files: string[]) => files.map((file) => path.join(configDir, file));
	const result = getComponentFiles(absolutize(components), configDir);
	expect(deabs(result)).toEqual(processedComponents);
});

it('getComponentFiles() should accept components as an array of globs', () => {
	const result = getComponentFiles(globArray, configDir);
	expect(deabs(result)).toEqual([
		'~/components/Annotation/Annotation.js',
		'~/components/Button/Button.js',
	]);
});

it('getComponentFiles() should accept components as a glob', () => {
	const result = getComponentFiles(glob, configDir);
	expect(deabs(result)).toEqual([
		'~/components/Annotation/Annotation.js',
		'~/components/Button/Button.js',
		'~/components/Placeholder/Placeholder.js',
		'~/components/Price/Price.js',
		'~/components/RandomButton/RandomButton.js',
	]);
});

it('getComponentFiles() should match globs case-sensitively (index.js is not [A-Z]*.js)', () => {
	// glob >= 9 ignores case on macOS/Windows unless told otherwise
	const result = getComponentFiles('components/**/*.js', configDir);
	expect(deabs(result)).toContain('~/components/Label/index.js');
	expect(deabs(getComponentFiles(glob, configDir))).not.toContain('~/components/Label/index.js');
});

it('getComponentFiles() should ignore specified patterns for globs', () => {
	const result = getComponentFiles(glob, configDir, ['**/*Button*']);
	expect(deabs(result)).toEqual([
		'~/components/Annotation/Annotation.js',
		'~/components/Placeholder/Placeholder.js',
		'~/components/Price/Price.js',
	]);
});

it('getComponentFiles() should ignore specified patterns for globs in arrays', () => {
	const result = getComponentFiles(globArray, configDir, ['**/*Button*']);
	expect(deabs(result)).toEqual(['~/components/Annotation/Annotation.js']);
});

it('getComponentFiles() should ignore specified patterns for globs from functions', () => {
	const result = getComponentFiles(() => globArray, configDir, ['**/*Button*']);
	expect(deabs(result)).toEqual(['~/components/Annotation/Annotation.js']);
});

it('getComponentFiles() should throw if components is not a function, array or a string', () => {
	const fn = () => getComponentFiles(42 as any, configDir);
	expect(fn).toThrowError('should be string, function or array');
});
