// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import checkEnvironment, {
	compareVersions,
	detectPackageManager,
	parseVersion,
	readOwnPackageJson,
	resolveProjectPackage,
	satisfiesRange,
	styleguidistBinOwner,
} from '../checkEnvironment.js';
import type { DoctorFinding } from '../types.js';

const testApp = (name: string) => path.resolve(import.meta.dirname, '../../../../test/apps', name);

const byId = (findings: DoctorFinding[], id: string) =>
	findings.filter((finding) => finding.id === id);

describe('parseVersion', () => {
	it.each([
		['1.2.3', [1, 2, 3]],
		['22.12', [22, 12, 0]],
		['24', [24, 0, 0]],
		['19.0.0-rc.1', [19, 0, 0]],
		['0.0.0-experimental-abc-20240101', [0, 0, 0]],
	])('should parse %s', (version, expected) => {
		expect(parseVersion(version)).toEqual(expected);
	});
});

describe('compareVersions', () => {
	it.each([
		['1.2.3', '1.2.3', 0],
		['1.2.4', '1.2.3', 1],
		['1.2.3', '1.3.0', -1],
		['22.12.0', '22.2.0', 1],
		['16.14.0', '16.14', 0],
	])('should compare %s with %s', (a, b, expected) => {
		expect(compareVersions(a, b)).toBe(expected);
	});
});

describe('satisfiesRange', () => {
	// The range this package actually publishes
	const engines = '^22.12.0 || >=24.0.0';

	it.each([
		['22.12.0', true],
		['22.20.1', true],
		['22.11.0', false],
		['23.5.0', false],
		['24.0.0', true],
		['26.7.0', true],
	])('should tell that Node %s is %s for the engines range', (version, expected) => {
		expect(satisfiesRange(version, engines)).toBe(expected);
	});

	it.each([
		['19.2.0', true],
		['16.14.0', true],
		['16.13.1', false],
	])('should tell that React %s is %s for the peer range', (version, expected) => {
		expect(satisfiesRange(version, '>=16.14.0')).toBe(expected);
	});

	// A range this hand-written check cannot read must produce no verdict rather than a wrong one
	it('should say nothing about a range it cannot parse', () => {
		expect(satisfiesRange('1.2.3', '1.x || ~2')).toBeUndefined();
	});
});

describe('detectPackageManager', () => {
	it.each([
		['package-lock.json', 'npm'],
		['yarn.lock', 'Yarn'],
		['pnpm-lock.yaml', 'pnpm'],
		['bun.lock', 'Bun'],
	])('should detect %s as %s', (lockfile, name) => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsg-doctor-'));
		fs.writeFileSync(path.join(dir, lockfile), '');
		expect(detectPackageManager(dir)).toMatchObject({ name });
	});

	it('should find the lockfile of a monorepo root', () => {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rsg-doctor-'));
		fs.writeFileSync(path.join(root, 'pnpm-lock.yaml'), '');
		const workspace = path.join(root, 'packages', 'ui');
		fs.mkdirSync(workspace, { recursive: true });
		expect(detectPackageManager(workspace)).toMatchObject({
			name: 'pnpm',
			lockfile: path.join(root, 'pnpm-lock.yaml'),
		});
	});
});

describe('styleguidistBinOwner', () => {
	/** A project whose node_modules/.bin/styleguidist is linked to the given package. */
	const projectWithBin = (owner: string) => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsg-doctor-bin-'));
		const bin = path.join(dir, 'node_modules', '.bin');
		fs.mkdirSync(bin, { recursive: true });
		fs.symlinkSync(`../${owner}/lib/bin/styleguidist.js`, path.join(bin, 'styleguidist'));
		return dir;
	};

	it('should name the package the command belongs to', () => {
		expect(styleguidistBinOwner(projectWithBin('react-styleguidist'))).toBe('react-styleguidist');
		expect(styleguidistBinOwner(projectWithBin('vite-styleguidist'))).toBe('vite-styleguidist');
	});

	it('should say nothing when there is no such command', () => {
		expect(
			styleguidistBinOwner(fs.mkdtempSync(path.join(os.tmpdir(), 'rsg-doctor-nobin-')))
		).toBeUndefined();
	});

	it('should warn when the command of a project still runs the old package', () => {
		const dir = projectWithBin('react-styleguidist');
		fs.writeFileSync(
			path.join(dir, 'package.json'),
			'{ "devDependencies": { "react-styleguidist": "^13.1.4" } }'
		);
		const [finding] = byId(checkEnvironment(dir), 'env.bin-conflict');
		expect(finding).toMatchObject({
			level: 'warning',
			title: 'The styleguidist command of this project runs react-styleguidist',
		});
	});

	it('should stay quiet when the command is this package', () => {
		expect(
			byId(checkEnvironment(projectWithBin('vite-styleguidist')), 'env.bin-conflict')
		).toHaveLength(0);
	});
});

it('should read our own package.json', () => {
	const own = readOwnPackageJson();
	expect(own.engines?.node).toBeTruthy();
	expect(own.peerDependencies?.react).toBeTruthy();
});

it('should resolve a package as the project resolves it', () => {
	expect(resolveProjectPackage(testApp('defaults'), 'react-dom')).toMatch(/^\d+\./);
	expect(resolveProjectPackage(testApp('defaults'), 'not-a-real-package')).toBeUndefined();
});

describe('checkEnvironment', () => {
	it('should report the Node version, React and the root flavour of a healthy project', () => {
		const findings = checkEnvironment(testApp('defaults'));
		expect(byId(findings, 'env.node')[0]).toMatchObject({
			level: 'info',
			title: expect.stringContaining(`Node.js v${process.versions.node}`),
		});
		expect(byId(findings, 'env.react').map((finding) => finding.meta?.package)).toEqual([
			'react',
			'react-dom',
		]);
		// The repo develops against React 19, so a style guide of it mounts with createRoot()
		expect(byId(findings, 'env.react-root')[0]).toMatchObject({
			level: 'info',
			meta: { flavor: 'modern' },
		});
		expect(byId(findings, 'env.react-missing')).toHaveLength(0);
		expect(byId(findings, 'env.react-styleguidist')).toHaveLength(0);
	});

	it('should report react-styleguidist declared by the project', () => {
		const [finding] = byId(checkEnvironment(testApp('legacy')), 'env.react-styleguidist');
		expect(finding).toMatchObject({
			level: 'info',
			title: 'react-styleguidist ^13.1.4 is still installed',
			docs: expect.stringContaining('#package-name-in-imports'),
		});
	});

	it('should report a missing React as an error', () => {
		// A directory with no package.json above it that has React: nothing resolves there
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsg-doctor-empty-'));
		fs.writeFileSync(path.join(dir, 'package.json'), '{ "name": "empty" }');
		const findings = checkEnvironment(dir);
		expect(byId(findings, 'env.react-missing').map((finding) => finding.meta?.package)).toEqual([
			'react',
			'react-dom',
		]);
		expect(byId(findings, 'env.react-missing')[0].level).toBe('error');
		// Without a react-dom there is nothing to say about the React root
		expect(byId(findings, 'env.react-root')).toHaveLength(0);
	});
});
