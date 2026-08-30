import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// The CLI is TypeScript ESM now, so the old `new vm.Script(source)` syntax check
// (which guarded against using syntax unsupported by old Node versions) no longer
// applies: the compiled output is what users run. Instead, run the compiled
// binary as a user would and check its output. Skipped when the package hasn’t
// been compiled (`npm run compile`), e.g. when running the unit tests alone.
const BIN_PATH = path.resolve(import.meta.dirname, '../../../lib/bin/styleguidist.js');

// Run from a fixture app: the CLI loads the nearest styleguide.config.js and the
// repository root has its own config (with `"type": "module"` in package.json).
const APP_DIR = path.resolve(import.meta.dirname, '../../../test/apps/defaults');

const run = (args: string[]) =>
	execFileSync(process.execPath, [BIN_PATH, ...args], {
		cwd: APP_DIR,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	});

const describeCompiled = fs.existsSync(BIN_PATH) ? describe : describe.skip;

describeCompiled('styleguidist CLI (compiled)', () => {
	it('should print help', () => {
		const output = run(['help']);
		expect(output).toMatch('Usage');
		expect(output).toMatch(/build\s+Build style guide/);
		expect(output).toMatch(/server\s+Run development server/);
		expect(output).toMatch('--config');
	});

	it('should print help when no command is given', () => {
		expect(run([])).toMatch('Usage');
	});

	it('should exit with an error when the config file does not exist', () => {
		expect.assertions(2);
		try {
			run(['help', '--config', 'pizza.config.js']);
		} catch (err: any) {
			expect(err.status).toBe(1);
			expect(String(err.stderr)).toMatch('Styleguidist config not found');
		}
	});
});
