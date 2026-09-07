import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import dirname from '../utils/dirname.js';
import { getReactRootFlavor } from '../make-vite-config.js';
import * as consts from '../consts.js';
import type { DoctorFinding } from './types.js';

/** Our own package.json: `lib/scripts/doctor/` and `src/scripts/doctor/` are both three deep. */
const OWN_PACKAGE_JSON = path.resolve(dirname(import.meta.url), '../../../package.json');

interface OwnPackage {
	version?: string;
	engines?: { node?: string };
	peerDependencies?: Record<string, string>;
}

export function readOwnPackageJson(): OwnPackage {
	try {
		return JSON.parse(fs.readFileSync(OWN_PACKAGE_JSON, 'utf8'));
	} catch {
		/* istanbul ignore next: only reachable if the package is installed broken */
		return {};
	}
}

/** `[major, minor, patch]` of a version, ignoring any `-prerelease` or `+build` suffix. */
export function parseVersion(version: string): [number, number, number] {
	const [core] = version.split(/[-+]/);
	const parts = core.split('.').map((part) => parseInt(part, 10));
	return [parts[0], parts[1] || 0, parts[2] || 0].map((part) =>
		Number.isNaN(part) ? NaN : part
	) as [number, number, number];
}

/** -1, 0 or 1, like a comparator. Prereleases compare as their release (good enough here). */
export function compareVersions(a: string, b: string): number {
	const left = parseVersion(a);
	const right = parseVersion(b);
	for (let i = 0; i < 3; i++) {
		if (left[i] !== right[i]) {
			return left[i] < right[i] ? -1 : 1;
		}
	}
	return 0;
}

/**
 * Whether a version satisfies a range, for the two clause shapes this package uses in its
 * `engines` and `peerDependencies`: `^x.y.z` and `>=x.y.z`, joined by `||`.
 *
 * Returns undefined for anything else, and every caller then reports the range instead of
 * judging it — a doctor that says “unsupported” because it cannot parse its own metadata
 * would be worse than one that stays quiet. (A real semver parser is a dependency this
 * package does not otherwise need.)
 */
export function satisfiesRange(version: string, range: string): boolean | undefined {
	const clauses = range.split('||').map((clause) => clause.trim());
	let satisfied = false;
	for (const clause of clauses) {
		const match = /^(\^|>=|>|=)?\s*v?(\d+(?:\.\d+)*)$/.exec(clause);
		if (!match) {
			return undefined;
		}
		const [, operator = '=', target] = match;
		const comparison = compareVersions(version, target);
		if (operator === '^') {
			// Caret on a major of 0 pins the minor as well; none of our ranges does that today
			satisfied ||= parseVersion(version)[0] === parseVersion(target)[0] && comparison >= 0;
		} else if (operator === '>=') {
			satisfied ||= comparison >= 0;
		} else if (operator === '>') {
			satisfied ||= comparison > 0;
		} else {
			satisfied ||= comparison === 0;
		}
	}
	return satisfied;
}

/** Lockfile in the project (or in a parent, for a package inside a monorepo). */
export function detectPackageManager(
	startDir: string
): { name: string; lockfile: string } | undefined {
	const lockfiles: [string, string][] = [
		['package-lock.json', 'npm'],
		['npm-shrinkwrap.json', 'npm'],
		['yarn.lock', 'Yarn'],
		['pnpm-lock.yaml', 'pnpm'],
		['bun.lock', 'Bun'],
		['bun.lockb', 'Bun'],
	];
	let dir = startDir;
	for (;;) {
		for (const [file, name] of lockfiles) {
			const candidate = path.join(dir, file);
			if (fs.existsSync(candidate)) {
				return { name, lockfile: candidate };
			}
		}
		const parent = path.dirname(dir);
		if (parent === dir) {
			return undefined;
		}
		dir = parent;
	}
}

/** Version of a package as the *project* resolves it, undefined when it is not installed. */
export function resolveProjectPackage(configDir: string, name: string): string | undefined {
	try {
		const requireFromProject = createRequire(path.join(configDir, 'package.json'));
		const { version } = requireFromProject(`${name}/package.json`) as { version?: string };
		return version;
	} catch {
		return undefined;
	}
}

/**
 * Which package the project’s `styleguidist` command runs.
 *
 * Both packages install a binary of that name, so in a project that has not removed
 * `react-styleguidist` yet, `npx styleguidist` and every `package.json` script that calls it
 * silently keep running the old one — whichever npm linked last wins. Reads the link (npm
 * symlinks the bin on POSIX and writes a shim naming the target on Windows).
 */
export function styleguidistBinOwner(configDir: string): string | undefined {
	const bin = path.join(configDir, 'node_modules', '.bin', 'styleguidist');
	try {
		const target = fs.lstatSync(bin).isSymbolicLink()
			? fs.readlinkSync(bin)
			: fs.readFileSync(bin, 'utf8');
		if (/react-styleguidist/.test(target)) {
			return 'react-styleguidist';
		}
		return /vite-styleguidist/.test(target) ? 'vite-styleguidist' : undefined;
	} catch {
		return undefined;
	}
}

function readProjectPackageJson(configDir: string): Record<string, any> {
	try {
		return JSON.parse(fs.readFileSync(path.join(configDir, 'package.json'), 'utf8'));
	} catch {
		return {};
	}
}

/**
 * Everything about the machine and the installed packages, rather than about the config: the
 * Node.js version, the React the style guide will bundle, leftovers of the old package, and
 * which package manager the project uses (so the report can suggest the right command).
 */
export default function checkEnvironment(configDir: string): DoctorFinding[] {
	const findings: DoctorFinding[] = [];
	const own = readOwnPackageJson();

	// Node.js against our own `engines`
	const nodeVersion = process.versions.node;
	const engines = own.engines?.node;
	const nodeOk = engines ? satisfiesRange(nodeVersion, engines) : undefined;
	findings.push({
		id: 'env.node',
		level: nodeOk === false ? 'error' : 'info',
		title: `Node.js v${nodeVersion}${engines ? ` (supported: ${engines})` : ''}`,
		fix:
			nodeOk === false
				? `Install a Node.js version matching ${engines}, Vite Styleguidist will not run on this one.`
				: undefined,
		docs: nodeOk === false ? consts.DOCS_COMPATIBILITY : undefined,
		meta: { version: nodeVersion, engines, supported: nodeOk },
	});

	// React and react-dom, as the *project* resolves them: that is the copy the style guide
	// bundles, which is not necessarily the one this package sees
	const peerRange = own.peerDependencies?.react;
	for (const name of ['react', 'react-dom']) {
		const version = resolveProjectPackage(configDir, name);
		if (!version) {
			findings.push({
				id: 'env.react-missing',
				level: 'error',
				title: `${name} is not installed in this project`,
				detail: `Resolved from ${configDir}`,
				fix: 'Install react and react-dom: they are peer dependencies of Vite Styleguidist.',
				docs: consts.DOCS_COMPATIBILITY,
				meta: { package: name },
			});
			continue;
		}
		// A major of 0 is React’s experimental channel (0.0.0-experimental-…), which no range
		// describes; treat it like getReactRootFlavor does and report it without a verdict
		const experimental = parseVersion(version)[0] === 0;
		const supported = peerRange && !experimental ? satisfiesRange(version, peerRange) : undefined;
		findings.push({
			id: 'env.react',
			level: supported === false ? 'error' : 'info',
			title: `${name} ${version}${peerRange ? ` (supported: ${peerRange})` : ''}`,
			fix:
				supported === false
					? `Upgrade ${name} to ${peerRange}, older versions are not supported.`
					: undefined,
			docs: supported === false ? consts.DOCS_COMPATIBILITY : undefined,
			meta: { package: name, version, peerRange, supported },
		});
	}

	// Which React root the guide will mount with, the one thing that differs by react-dom major
	if (resolveProjectPackage(configDir, 'react-dom')) {
		const flavor = getReactRootFlavor(configDir);
		findings.push({
			id: 'env.react-root',
			level: 'info',
			title: `The style guide will mount with ${
				flavor === 'modern' ? 'createRoot()' : 'ReactDOM.render()'
			} (react-dom ${flavor === 'modern' ? '18 and newer' : '16/17'})`,
			meta: { flavor },
		});
	}

	// The package this one forked from: harmless to keep installed, but it is dead weight and
	// a deep import that still points at it will not pick up any of the fixes here
	const projectPackageJson = readProjectPackageJson(configDir);
	const declared =
		projectPackageJson.dependencies?.['react-styleguidist'] ||
		projectPackageJson.devDependencies?.['react-styleguidist'];
	const installed = resolveProjectPackage(configDir, 'react-styleguidist');
	if (declared || installed) {
		findings.push({
			id: 'env.react-styleguidist',
			level: 'info',
			title: `react-styleguidist ${installed || declared} is still installed`,
			detail: 'Vite Styleguidist does not need it.',
			fix: 'Uninstall it once nothing imports it any more.',
			docs: `${consts.DOCS_MIGRATION}#package-name-in-imports`,
			meta: { version: installed || declared },
		});
	}

	if (styleguidistBinOwner(configDir) === 'react-styleguidist') {
		findings.push({
			id: 'env.bin-conflict',
			level: 'warning',
			title: 'The styleguidist command of this project runs react-styleguidist',
			detail: 'Both packages install a binary of that name, and npm kept the old one.',
			fix: 'Run vite-styleguidist instead, or uninstall react-styleguidist and reinstall.',
			docs: `${consts.DOCS_MIGRATION}#start-with-the-doctor`,
			file: path.join(configDir, 'node_modules', '.bin', 'styleguidist'),
		});
	}

	const packageManager = detectPackageManager(configDir);
	if (packageManager) {
		findings.push({
			id: 'env.package-manager',
			level: 'info',
			title: `Package manager: ${packageManager.name}`,
			detail: packageManager.lockfile,
			file: packageManager.lockfile,
			meta: { name: packageManager.name },
		});
	}

	findings.push({
		id: 'env.styleguidist',
		level: 'info',
		title: `vite-styleguidist ${own.version || 'unknown'}`,
		meta: { version: own.version },
	});

	return findings;
}
