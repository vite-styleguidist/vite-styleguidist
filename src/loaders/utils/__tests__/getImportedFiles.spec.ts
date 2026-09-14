// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import getImportedFiles, {
	MAX_IMPORTED_FILES,
	clearImportsCache,
	resolveRelativeImport,
} from '../getImportedFiles.js';

let dir: string;

beforeEach(() => {
	// realpath, so the paths this returns can be compared with the ones it was given
	dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'rsg-imported-')));
	clearImportsCache();
});

afterEach(() => {
	fs.rmSync(dir, { recursive: true, force: true });
});

const write = (name: string, content: string) => {
	const file = path.join(dir, name);
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, content);
	return file;
};

describe('resolveRelativeImport', () => {
	it('should find a file with no extension written', () => {
		const types = write('types.ts', 'export interface Props { a: string }');
		expect(resolveRelativeImport('./types', path.join(dir, 'Card.tsx'))).toBe(types);
	});

	it('should find a file whose extension is written out', () => {
		const props = write('props.js', 'export default {}');
		expect(resolveRelativeImport('./props.js', path.join(dir, 'Card.js'))).toBe(props);
	});

	// TypeScript ES modules: `./types.js` in a .ts file means `./types.ts`
	it('should follow a .js specifier to the .ts file next to it', () => {
		const types = write('types.ts', 'export type A = string');
		expect(resolveRelativeImport('./types.js', path.join(dir, 'Card.ts'))).toBe(types);
	});

	it('should find the index file of a folder', () => {
		const index = write('shared/index.ts', 'export type A = string');
		expect(resolveRelativeImport('./shared', path.join(dir, 'Card.tsx'))).toBe(index);
	});

	it('should find a declaration file', () => {
		const declared = write('globals.d.ts', 'export type A = string');
		expect(resolveRelativeImport('./globals', path.join(dir, 'Card.tsx'))).toBe(declared);
	});

	// A package is identified by its version, not by its files; a path alias needs the
	// project's TypeScript and Vite configuration to resolve, and guessing it wrong silently
	// is worse than not trying. Both are documented next to the `propsParser` option.
	it.each(['react', '@acme/tokens', '@/types', 'lodash/pick.js'])(
		'should not follow %s',
		(specifier) => {
			expect(resolveRelativeImport(specifier, path.join(dir, 'Card.tsx'))).toBeUndefined();
		}
	);

	it('should answer nothing for a file that is not there', () => {
		expect(resolveRelativeImport('./missing', path.join(dir, 'Card.tsx'))).toBeUndefined();
	});
});

describe('getImportedFiles', () => {
	it('should follow imports transitively and leave the entry out', () => {
		const tone = write('tone.ts', `export type Tone = 'info'`);
		const types = write('types.ts', `import type { Tone } from './tone';\nexport type P = Tone;`);
		const card = write('Card.tsx', `import type { P } from './types';\nexport default null;`);

		expect(getImportedFiles(card).sort()).toEqual([tone, types].sort());
	});

	it('should keep a type-only import, which is where props types live', () => {
		const types = write('types.ts', 'export interface Props { a: string }');
		const card = write('Card.tsx', `import type { Props } from './types';\nexport default null;`);

		expect(getImportedFiles(card)).toEqual([types]);
	});

	it.each([
		['export … from', `export { Props } from './types';`],
		['export * from', `export * from './types';`],
		['require()', `const p = require('./types');`],
		['import x = require()', `import p = require('./types');`],
	])('should follow a %s', (_name, code) => {
		const types = write('types.ts', 'export interface Props { a: string }');
		expect(getImportedFiles(write('Card.tsx', code))).toEqual([types]);
	});

	it('should survive a cycle', () => {
		const a = write('a.ts', `import './b';\nexport type A = string;`);
		const b = write('b.ts', `import './a';\nexport type B = string;`);

		expect(getImportedFiles(a)).toEqual([b]);
		expect(getImportedFiles(b)).toEqual([a]);
	});

	it('should answer nothing for a file that cannot be read or parsed', () => {
		expect(getImportedFiles(path.join(dir, 'nope.tsx'))).toEqual([]);
		expect(getImportedFiles(write('broken.tsx', 'import from ;;; {'))).toEqual([]);
	});

	it('should stop at the cap rather than walk a whole design system', () => {
		const many = Array.from({ length: MAX_IMPORTED_FILES + 20 }, (_, index) => {
			write(`part${index}.ts`, `export type P${index} = string;`);
			return `import './part${index}';`;
		}).join('\n');

		expect(getImportedFiles(write('Barrel.tsx', many))).toHaveLength(MAX_IMPORTED_FILES);
	});

	it('should notice that a file it has already scanned changed', () => {
		const first = write('first.ts', 'export type A = string');
		const card = write('Card.tsx', `import './first';`);
		expect(getImportedFiles(card)).toEqual([first]);

		const second = write('second.ts', 'export type B = string');
		// A new mtime and a different size, which is what the memo is keyed on
		fs.writeFileSync(card, `import './second';\n// a longer file than before`);
		expect(getImportedFiles(card)).toEqual([second]);
	});
});
