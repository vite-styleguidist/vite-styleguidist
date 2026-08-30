import path from 'node:path';
import findFileCaseInsensitive, { clearCache } from '../findFileCaseInsensitive.js';

it('should return a file path with the correct case if a file exists', () => {
	const result = findFileCaseInsensitive(
		path.join(import.meta.dirname, 'Findfilecaseinsensitive.Spec.TS')
	);
	expect(result).toMatch(import.meta.filename);
});

it('should return undefined if a file doesn’t exist', () => {
	const result = findFileCaseInsensitive(path.join(import.meta.dirname, 'pizza.js'));
	expect(result).toBeFalsy();
});

it('cache clean function shouldn’t throw', () => {
	const fn = () => clearCache();
	expect(fn).not.toThrow();
});
