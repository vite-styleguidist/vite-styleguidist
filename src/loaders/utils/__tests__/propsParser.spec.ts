// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
	clearPropsParserCache,
	getPropsParser,
	loadPropsParser,
	propsParserIdentity,
	resolvePropsParserPath,
} from '../propsParser.js';
import StyleguidistError from '../../../scripts/utils/error.js';

let dir: string;
beforeEach(() => {
	// realpath: on macOS the temp folder is a symlink, and `require.resolve()` answers with
	// the real path — which is also what the option ends up storing
	dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'rsg-parser-')));
	clearPropsParserCache();
});
afterEach(() => {
	fs.rmSync(dir, { recursive: true, force: true });
});

const write = (name: string, source: string) => {
	const file = path.join(dir, name);
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, source);
	return file;
};

describe('resolvePropsParserPath', () => {
	it('should resolve a path relative to the config folder', () => {
		const file = write('styleguide.parser.cjs', 'module.exports = () => ({});');
		expect(resolvePropsParserPath('./styleguide.parser.cjs', dir)).toBe(file);
	});

	it('should resolve a package installed in the project', () => {
		write('node_modules/acme-parser/package.json', '{"name":"acme-parser","main":"index.cjs"}');
		const file = write('node_modules/acme-parser/index.cjs', 'module.exports = () => ({});');
		expect(resolvePropsParserPath('acme-parser', dir)).toBe(file);
	});

	it('should name the option when nothing resolves', () => {
		expect(() => resolvePropsParserPath('./nope.js', dir)).toThrow(StyleguidistError);
		expect(() => resolvePropsParserPath('./nope.js', dir)).toThrow(/propsParser/);
	});
});

describe('loadPropsParser', () => {
	it('should take the default export of an ES module', () => {
		const file = write('parser.mjs', 'export default () => ({ displayName: "Esm" });');
		expect(loadPropsParser(file, dir)('a.js', '', {} as never, [])).toEqual({ displayName: 'Esm' });
	});

	it('should take a CommonJS module that exports the function itself', () => {
		const file = write('parser.cjs', 'module.exports = () => ({ displayName: "Cjs" });');
		expect(loadPropsParser(file, dir)('a.js', '', {} as never, [])).toEqual({ displayName: 'Cjs' });
	});

	it('should take a CommonJS module with a `default` property', () => {
		const file = write('parser.cjs', 'module.exports = { default: () => ({ displayName: "D" }) };');
		expect(loadPropsParser(file, dir)('a.js', '', {} as never, [])).toEqual({ displayName: 'D' });
	});

	it('should load the module only once, however often it is asked for', () => {
		const file = write(
			'parser.cjs',
			'global.__rsgParserLoads = (global.__rsgParserLoads || 0) + 1;\nmodule.exports = () => ({});'
		);
		loadPropsParser(file, dir);
		loadPropsParser(file, dir);
		expect((globalThis as Record<string, unknown>).__rsgParserLoads).toBe(1);
	});

	it('should refuse a module whose default export is not a function', () => {
		const file = write('parser.cjs', 'module.exports = { parse: () => ({}) };');
		expect(() => loadPropsParser(file, dir)).toThrow(/not a function/);
	});

	it('should explain a module that cannot be loaded', () => {
		const file = write('parser.cjs', 'throw new Error("boom");');
		expect(() => loadPropsParser(file, dir)).toThrow(/could not be loaded/);
		expect(() => loadPropsParser(file, dir)).toThrow(/boom/);
	});

	it('should explain a top-level await, which cannot be required', () => {
		const file = write('parser.mjs', 'await Promise.resolve();\nexport default () => ({});');
		expect(() => loadPropsParser(file, dir)).toThrow(/top-level await/);
	});
});

describe('getPropsParser', () => {
	it('should return undefined for the default parser', () => {
		expect(getPropsParser({ propsParser: undefined as never, configDir: dir })).toBeUndefined();
	});

	it('should return a function option unchanged', () => {
		const parser = () => ({});
		expect(getPropsParser({ propsParser: parser as never, configDir: dir })).toBe(parser);
	});

	it('should load a module path', () => {
		const file = write('parser.cjs', 'module.exports = () => ({ displayName: "M" });');
		const parser = getPropsParser({ propsParser: file as never, configDir: dir });
		expect(parser?.('a.js', '', {} as never, [])).toEqual({ displayName: 'M' });
	});
});

describe('propsParserIdentity', () => {
	it('should change when a project parser file is edited', () => {
		const file = write('parser.cjs', 'module.exports = () => ({});');
		const before = propsParserIdentity(file, dir);
		fs.writeFileSync(file, 'module.exports = () => ({ displayName: "X" });');
		expect(propsParserIdentity(file, dir)).not.toBe(before);
	});

	it('should be the name and version for a parser inside a package', () => {
		write('node_modules/acme-parser/package.json', '{"name":"acme-parser","version":"1.2.3","main":"index.cjs"}');
		write('node_modules/acme-parser/index.cjs', 'module.exports = () => ({});');
		expect(propsParserIdentity('acme-parser', dir)).toContain('acme-parser@1.2.3');
	});

	it('should follow the installed version of a packaged parser', () => {
		write('node_modules/acme-parser/package.json', '{"name":"acme-parser","version":"1.2.3","main":"index.cjs"}');
		write('node_modules/acme-parser/index.cjs', 'module.exports = () => ({});');
		const before = propsParserIdentity('acme-parser', dir);
		write('node_modules/acme-parser/package.json', '{"name":"acme-parser","version":"2.0.0","main":"index.cjs"}');
		expect(propsParserIdentity('acme-parser', dir)).not.toBe(before);
	});
});
