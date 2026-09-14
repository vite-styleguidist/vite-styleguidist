// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import doctor, { formatDoctorReport } from '../doctor.js';
import type { DoctorFinding, DoctorReport } from '../doctor.js';

const testApp = (name: string) => path.resolve(import.meta.dirname, '../../../test/apps', name);

const cwd = process.cwd();
afterEach(() => {
	process.chdir(cwd);
});

const ids = (findings: DoctorFinding[]) => findings.map((finding) => finding.id);
const optionsOf = (report: DoctorReport, id: string) =>
	report.findings.filter((finding) => finding.id === id).map((finding) => finding.meta?.option);

describe('a project that is fine', () => {
	const report = () => doctor({ config: path.join(testApp('defaults'), 'styleguide.config.js') });

	it('should be ok, with no errors and no warnings', () => {
		expect(report()).toMatchObject({
			ok: true,
			counts: { error: 0, warning: 0 },
			configFile: path.join(testApp('defaults'), 'styleguide.config.js'),
			node: process.version,
			reportVersion: 1,
		});
	});

	it('should still report what it knows about the environment', () => {
		expect(ids(report().findings)).toEqual(
			expect.arrayContaining([
				'env.node',
				'env.react',
				'env.react-root',
				'env.styleguidist',
				'project.components',
			])
		);
	});

	it('should print a report that says there is nothing to do', () => {
		const text = formatDoctorReport(report());
		expect(text).toMatch('Vite Styleguidist doctor');
		expect(text).toMatch('No problems found');
		expect(text).not.toMatch('Errors (');
	});
});

describe('a project that still looks like 13.x', () => {
	const report = () => doctor({ config: path.join(testApp('legacy'), 'styleguide.config.js') });

	it('should not be ok', () => {
		const result = report();
		expect(result.ok).toBe(false);
		expect(result.counts.error).toBeGreaterThan(0);
	});

	it('should list every config problem exactly once', () => {
		const result = report();
		expect(optionsOf(result, 'config.removed-option').sort()).toEqual([
			'dangerouslyUpdateWebpackConfig',
			'editorConfig',
			'updateWebpackConfig',
			'webpackConfig',
		]);
		expect(optionsOf(result, 'config.unknown-option')).toEqual(['styleguidComponents']);
		expect(optionsOf(result, 'config.invalid-type')).toEqual(['skipComponentsWithoutExample']);
		expect(optionsOf(result, 'config.deprecated-option').sort()).toEqual(['showCode', 'showUsage']);
		// No option is reported twice, whatever the check that found it
		const options = result.findings
			.filter((finding) => finding.id.startsWith('config.'))
			.map((finding) => finding.meta?.option);
		expect(new Set(options).size).toBe(options.length);
	});

	it('should find every problem in the project files exactly once', () => {
		const found = ids(report().findings).filter((id) => id.startsWith('project.'));
		expect(found.sort()).toEqual([
			'project.commonjs-theme',
			'project.components',
			'project.old-package',
			'project.process-env',
			'project.require-context',
			'project.webpack-config',
		]);
	});

	it('should say that the old package is still installed', () => {
		expect(ids(report().findings)).toContain('env.react-styleguidist');
	});

	it('should put the errors first, then the warnings, then the info', () => {
		const levels = report().findings.map((finding) => finding.level);
		expect(levels).toEqual([...levels].sort((a, b) => 'ewi'.indexOf(a[0]) - 'ewi'.indexOf(b[0])));
	});

	it('should count what it found', () => {
		const result = report();
		for (const level of ['error', 'warning', 'info'] as const) {
			expect(result.counts[level]).toBe(
				result.findings.filter((finding) => finding.level === level).length
			);
		}
	});

	it('should give every finding a fix or a docs pointer', () => {
		for (const finding of report().findings) {
			if (finding.level === 'info') {
				continue;
			}
			expect(finding.fix || finding.docs).toBeTruthy();
		}
	});

	it('should print the fix and the docs of every problem', () => {
		const text = formatDoctorReport(report());
		expect(text).toMatch('Errors (');
		expect(text).toMatch('Warnings (');
		expect(text).toMatch('Fix:');
		expect(text).toMatch('Docs:');
		expect(text).toMatch(/Found \d+ errors and \d+ warnings\./);
	});
});

describe('a directory without a style guide', () => {
	it('should say so and check the defaults', () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsg-doctor-none-'));
		process.chdir(dir);
		const report = doctor();
		expect(report.configFile).toBeNull();
		expect(ids(report.findings)).toContain('config.not-found');
		// Defaults were applied, so the components pattern was still checked
		expect(ids(report.findings)).toContain('project.components');
		expect(formatDoctorReport(report)).toMatch('Config: none found');
	});
});

it('should throw when the given config file does not exist', () => {
	expect(() => doctor({ config: '/pizza/styleguide.config.js' })).toThrow(
		'Styleguidist config not found'
	);
});
