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
const REPO_DIR = path.resolve(import.meta.dirname, '../../..');

const run = (args: string[]) =>
	execFileSync(process.execPath, [BIN_PATH, ...args], {
		cwd: APP_DIR,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	});

/** Same, but keeping the output of a command that exits with an error (the doctor does). */
const runFailing = (args: string[]) => {
	try {
		return { status: 0, stdout: run(args) };
	} catch (err: any) {
		return { status: err.status as number, stdout: String(err.stdout) };
	}
};

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

	it('should list the doctor in the help', () => {
		expect(run(['help'])).toMatch(/doctor\s+Check the config/);
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

describeCompiled('styleguidist doctor (compiled)', () => {
	const configOf = (...segments: string[]) => path.join(REPO_DIR, ...segments);

	it('should report nothing to fix for the basic example', () => {
		const output = run(['doctor', '--config', configOf('examples/basic/styleguide.config.js')]);
		expect(output).toMatch('No problems found');
		expect(output).not.toMatch('Errors (');
		expect(output).not.toMatch('Warnings (');
	});

	it('should exit with 0 when there is nothing to fix', () => {
		expect(
			runFailing(['doctor', '--config', configOf('examples/basic/styleguide.config.js')]).status
		).toBe(0);
	});

	it('should exit with 1 and list every problem of a 13.x config exactly once', () => {
		const { status, stdout } = runFailing([
			'doctor',
			'--config',
			configOf('test/apps/legacy/styleguide.config.js'),
			'--json',
		]);
		expect(status).toBe(1);

		const report = JSON.parse(stdout);
		expect(report).toMatchObject({ reportVersion: 1, ok: false });
		expect(report.configFile).toBe(configOf('test/apps/legacy/styleguide.config.js'));

		// Every problem of the fixture, and each of them once
		const ids = report.findings.map((finding: { id: string }) => finding.id);
		expect(ids.filter((id: string) => id === 'config.removed-option')).toHaveLength(4);
		expect(ids.filter((id: string) => id === 'config.deprecated-option')).toHaveLength(2);
		expect(ids).toEqual(
			expect.arrayContaining([
				'config.unknown-option',
				'config.invalid-type',
				'project.commonjs-theme',
				'project.require-context',
				'project.process-env',
				'project.old-package',
				'project.webpack-config',
				'env.react-styleguidist',
			])
		);
		expect(new Set(ids).size).toBeLessThan(ids.length);
		expect(report.counts.error).toBe(
			report.findings.filter((finding: { level: string }) => finding.level === 'error').length
		);
	});

	it('should print a report a person can read without --json', () => {
		const { stdout } = runFailing([
			'doctor',
			'--config',
			configOf('test/apps/legacy/styleguide.config.js'),
		]);
		expect(stdout).toMatch('webpackConfig config option was removed');
		expect(stdout).toMatch('Did you mean "styleguideComponents"?');
		expect(stdout).toMatch('#requirecontext');
	});

	it('should find the config of the current directory on its own', () => {
		expect(run(['doctor'])).toMatch(path.join(APP_DIR, 'styleguide.config.js'));
	});

	// There is nothing to diagnose without a config: this is the one case the doctor gives up on
	it('should exit with an error when the given config file does not exist', () => {
		const { status, stdout } = runFailing(['doctor', '--config', 'pizza.config.js']);
		expect(status).toBe(1);
		expect(stdout).toBe('');
	});
});
