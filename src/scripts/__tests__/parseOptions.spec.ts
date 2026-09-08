// The two performance options (`cache` and `parallel`) and the module-path form of
// `propsParser`, as the config schema validates them. See
// docs/decisions/0018-parse-cache-and-parallel-parsing.md.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import getConfig from '../config.js';

const testApp = (name: string) => path.resolve(import.meta.dirname, '../../../test/apps', name);

const cwd = process.cwd();
beforeEach(() => {
	process.chdir(testApp('defaults'));
});
afterAll(() => {
	process.chdir(cwd);
});

describe('cache', () => {
	it('should be on by default', () => {
		expect(getConfig({})).toMatchObject({ cache: true });
	});

	it.each([true, false])('should accept %s', (cache) => {
		expect(getConfig({ cache })).toMatchObject({ cache });
	});

	it('should reject anything but a boolean', () => {
		expect(() => getConfig({ cache: 'yes' } as never)).toThrow(/cache config option should be/);
	});
});

describe('parallel', () => {
	it('should default to auto', () => {
		expect(getConfig({})).toMatchObject({ parallel: 'auto' });
	});

	it.each([true, false, 'auto', 1, 4, 12])('should accept %s', (parallel) => {
		expect(getConfig({ parallel } as never)).toMatchObject({ parallel });
	});

	it.each([0, -1, 2.5])('should reject %s as a worker count', (parallel) => {
		expect(() => getConfig({ parallel } as never)).toThrow(
			/parallel config option must be a whole number of workers/
		);
	});

	it('should point at `false` rather than guess what 0 meant', () => {
		expect(() => getConfig({ parallel: 0 } as never)).toThrow(/Use false to parse on the main thread/);
	});

	it('should reject a string other than auto', () => {
		expect(() => getConfig({ parallel: 'yes' } as never)).toThrow(
			/parallel config option must be "auto", a boolean or a number of workers/
		);
	});

	it('should reject a value of another type', () => {
		expect(() => getConfig({ parallel: {} } as never)).toThrow(/parallel config option should be/);
	});
});

describe('propsParser', () => {
	let dir: string;
	beforeEach(() => {
		dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'rsg-parseropt-')));
	});
	afterEach(() => {
		fs.rmSync(dir, { recursive: true, force: true });
	});

	it('should keep a function as it is', () => {
		const propsParser = () => ({});
		expect(getConfig({ propsParser } as never)).toMatchObject({ propsParser });
	});

	it('should resolve a module path against the config folder', () => {
		const parser = path.join(dir, 'styleguide.parser.cjs');
		fs.writeFileSync(parser, 'module.exports = () => ({});');
		// The config folder is the folder the config file lives in; getConfig() takes it from
		// the current directory when no file is named
		process.chdir(dir);
		expect(getConfig({ propsParser: './styleguide.parser.cjs' } as never)).toMatchObject({
			propsParser: parser,
		});
	});

	it('should fail with the option’s name when the module cannot be resolved', () => {
		process.chdir(dir);
		expect(() => getConfig({ propsParser: './nope.js' } as never)).toThrow(
			/propsParser config option points at a module that cannot be resolved/
		);
	});

	it('should reject a value that is neither a function nor a string', () => {
		expect(() => getConfig({ propsParser: 42 } as never)).toThrow(
			/propsParser config option should be function or string/
		);
	});
});
