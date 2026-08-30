import path from 'node:path';
import commonDir from '../commonDir.js';

// Absolute paths built with the platform separator (and no drive letter) so the
// expectations hold on Windows too
const abs = (...segments: string[]) => path.sep + segments.join(path.sep);

describe('commonDir', () => {
	it('should return an empty string when there are no files', () => {
		expect(commonDir([])).toBe('');
	});

	it('should return the directory of a single file', () => {
		expect(commonDir([abs('src', 'components', 'Button.js')])).toBe(abs('src', 'components'));
	});

	it('should return the deepest directory containing all files', () => {
		const files = [
			abs('src', 'components', 'Button', 'Button.js'),
			abs('src', 'components', 'Input', 'Input.js'),
			abs('src', 'components', 'index.js'),
		];
		expect(commonDir(files)).toBe(abs('src', 'components'));
	});

	it('should compare whole path segments, not string prefixes', () => {
		const files = [abs('src', 'components', 'Button.js'), abs('src', 'components2', 'Input.js')];
		expect(commonDir(files)).toBe(abs('src'));
	});

	it('should return the root when the files share no directory', () => {
		expect(commonDir([abs('a', 'x.js'), abs('b', 'y.js')])).toBe(path.sep);
	});
});
