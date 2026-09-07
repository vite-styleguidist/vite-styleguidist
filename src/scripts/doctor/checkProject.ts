import fs from 'node:fs';
import path from 'node:path';
import getComponentFiles from '../../loaders/utils/getComponentFiles.js';
import * as consts from '../consts.js';
import { listNames, plural } from './text.js';
import type { DoctorFinding } from './types.js';
import type * as Rsg from '../../typings/index.js';

/**
 * How many files the scan reads at most. A style guide with more components than this exists,
 * and reading every one of them would turn a command that is supposed to answer in a second
 * into a minute of I/O; the report says when it stopped early so the number is never a lie.
 */
export const MAX_FILES = 3000;

/** Files bigger than this are generated or vendored, never hand-written components. */
export const MAX_FILE_SIZE = 512 * 1024;

/** Only these are read: the scan looks for JavaScript syntax, `.css` and `.svg` have none. */
const CODE_EXTENSIONS = ['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts'];

/** Environment variables Styleguidist itself replaces in the bundle (see make-vite-config). */
export const REPLACED_ENV_VARS = ['NODE_ENV', 'STYLEGUIDIST_ENV'];

const WEBPACK_CONFIG_FILES = [
	'webpack.config.js',
	'webpack.config.mjs',
	'webpack.config.cjs',
	'webpack.config.ts',
	'webpack.config.babel.js',
];
const VITE_CONFIG_FILES = [
	'vite.config.js',
	'vite.config.mjs',
	'vite.config.cjs',
	'vite.config.ts',
	'vite.config.mts',
	'vite.config.cts',
];

// `module.exports = …` at the start of a line: a theme file written as CommonJS. Anchored so a
// mention in a comment (`// module.exports`) or in a diff (`- module.exports`) is not a finding.
const CJS_EXPORTS = /^[ \t]*module\.exports\s*[=[.]/m;
const CJS_REQUIRE = /^[ \t]*(?:const|let|var)\s+.*=\s*require\s*\(/m;
// `require.context(…)`: webpack-only, and there is no shape of it Vite understands
const REQUIRE_CONTEXT = /(^|[^.\w$])require\.context\s*\(/;
const PROCESS_ENV_DOT = /process\.env\.([A-Za-z_$][\w$]*)/g;
const PROCESS_ENV_INDEX = /process\.env\[\s*['"]([^'"]+)['"]\s*\]/g;
// Any string literal naming the old package: an import, a `require()`, a jest mock, an alias
const OLD_PACKAGE = /['"]react-styleguidist(?:\/[^'"]*)?['"]/;

/** Every `components` value in the config, including the ones nested in sections. */
export function collectComponentPatterns(config: Partial<Rsg.SanitizedStyleguidistConfig>) {
	const patterns: NonNullable<Rsg.SanitizedStyleguidistConfig['components']>[] = [];
	const walk = (sections?: Rsg.ConfigSection[]) => {
		for (const section of sections || []) {
			if (section.components) {
				patterns.push(section.components);
			}
			walk(section.sections);
		}
	};
	// `sections` already contains `components` as its first section (see the schema), but a
	// config that failed validation may not have been normalized, so take both and dedupe later
	if (config.components) {
		patterns.push(config.components);
	}
	walk(config.sections);
	return patterns;
}

/** Files named directly by the config: they are bundled for the browser like components are. */
export function collectConfigFiles(
	config: Partial<Rsg.SanitizedStyleguidistConfig>,
	configDir: string
): string[] {
	const files: string[] = [];
	// `theme` and `styles` are already absolute here (the schema resolves the string form);
	// `template` is an object today, and is read as a path only in case it ever holds one again
	const named: unknown[] = [config.theme, config.styles, config.template];
	for (const value of named) {
		if (typeof value === 'string') {
			files.push(path.resolve(configDir, value));
		}
	}
	for (const entry of config.require || []) {
		// `require` holds module ids too (`core-js/stable`); only the ones that are files here
		const candidate = path.resolve(configDir, entry);
		if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
			files.push(candidate);
		}
	}
	return files;
}

/**
 * Look for the four things a webpack-era project carries that Vite does not understand.
 *
 * Deliberately a regex pass over the raw text and not a parse: the doctor runs before anything
 * is known to work, so it must not depend on the project being parseable, and one read per
 * file keeps a thousand-component style guide under a second.
 */
export default function checkProject(
	config: Partial<Rsg.SanitizedStyleguidistConfig>,
	configDir: string,
	options: { maxFiles?: number; maxFileSize?: number } = {}
): DoctorFinding[] {
	const maxFiles = options.maxFiles ?? MAX_FILES;
	const maxFileSize = options.maxFileSize ?? MAX_FILE_SIZE;
	const findings: DoctorFinding[] = [];

	// Resolve components exactly the way the style guide does, so “no components found” here
	// means “an empty style guide” there
	const patterns = collectComponentPatterns(config);
	const componentFiles: string[] = [];
	for (const pattern of patterns) {
		try {
			componentFiles.push(...getComponentFiles(pattern, configDir, config.ignore));
		} catch (err) {
			findings.push({
				id: 'project.components-failed',
				level: 'error',
				title: 'The components option could not be resolved',
				detail: err instanceof Error ? err.message : String(err),
				fix: 'Check the components option (and the components of every section).',
				docs: `${consts.DOCS_CONFIG}#components`,
			});
		}
	}
	const uniqueComponents = [...new Set(componentFiles)].sort();

	// A pattern that matches nothing is worth a warning, but a config that asks for no
	// components at all (a style guide of Markdown sections) is a choice, not a problem
	const noPatterns = patterns.length === 0;
	const nothingMatched = !noPatterns && uniqueComponents.length === 0;
	findings.push({
		id: 'project.components',
		level: nothingMatched ? 'warning' : 'info',
		title: noPatterns
			? 'This config does not list any components'
			: nothingMatched
				? 'No components matched the components option'
				: `Found ${plural(uniqueComponents.length, 'component')}`,
		fix: nothingMatched
			? 'Check the pattern: component globs are case-sensitive now, so [A-Z]*.js no longer matches index.js.'
			: undefined,
		docs: nothingMatched
			? `${consts.DOCS_MIGRATION}#components-patterns-are-case-sensitive`
			: undefined,
		meta: { count: uniqueComponents.length, patterns: patterns.length },
	});

	const configFiles = collectConfigFiles(config, configDir);
	const themeAndStyles = new Set(
		[config.theme, config.styles]
			.filter((value): value is string => typeof value === 'string')
			.map((value) => path.resolve(configDir, value))
	);

	// Config-named files first: they are few, and they are the ones a capped scan must not miss
	const targets: string[] = [...new Set([...configFiles, ...uniqueComponents])];
	const scanned = targets.slice(0, maxFiles);
	if (targets.length > scanned.length) {
		findings.push({
			id: 'project.scan-capped',
			level: 'info',
			title: `Scanned the first ${plural(scanned.length, 'file')} of ${targets.length}`,
			detail: 'The checks below cover those files only.',
			meta: { scanned: scanned.length, total: targets.length },
		});
	}

	const cjsFiles: string[] = [];
	const requireContextFiles: string[] = [];
	const oldPackageFiles: string[] = [];
	const envFiles: string[] = [];
	const envNames = new Set<string>();

	for (const file of scanned) {
		if (!CODE_EXTENSIONS.includes(path.extname(file))) {
			continue;
		}
		let code: string;
		try {
			if (fs.statSync(file).size > maxFileSize) {
				continue;
			}
			code = fs.readFileSync(file, 'utf8');
		} catch {
			// A component that disappeared between the glob and the read, or is unreadable:
			// not something a migration report should stop for
			continue;
		}

		// CommonJS is only a problem in the files Styleguidist bundles *as modules of its own*
		// (theme, styles): components go through Vite, which reports it far more precisely
		if (themeAndStyles.has(file) && (CJS_EXPORTS.test(code) || CJS_REQUIRE.test(code))) {
			cjsFiles.push(file);
		}
		if (REQUIRE_CONTEXT.test(code)) {
			requireContextFiles.push(file);
		}
		if (OLD_PACKAGE.test(code)) {
			oldPackageFiles.push(file);
		}
		let found = false;
		for (const regexp of [PROCESS_ENV_DOT, PROCESS_ENV_INDEX]) {
			regexp.lastIndex = 0;
			let match = regexp.exec(code);
			while (match) {
				if (!REPLACED_ENV_VARS.includes(match[1])) {
					envNames.add(match[1]);
					found = true;
				}
				match = regexp.exec(code);
			}
		}
		if (found) {
			envFiles.push(file);
		}
	}

	if (cjsFiles.length > 0) {
		findings.push({
			id: 'project.commonjs-theme',
			level: 'error',
			title: `CommonJS syntax in ${plural(cjsFiles.length, 'theme or styles file')}`,
			detail: 'These files are bundled for the browser and must be ES modules.',
			files: cjsFiles,
			fix: 'Replace module.exports with export default, and require() with import.',
			docs: `${consts.DOCS_MIGRATION}#theme-and-styles-files`,
		});
	}

	if (requireContextFiles.length > 0) {
		findings.push({
			id: 'project.require-context',
			level: 'error',
			title: `require.context() in ${plural(requireContextFiles.length, 'file')}`,
			detail: 'Vite has no require.context().',
			files: requireContextFiles,
			fix: 'Use import.meta.glob() instead.',
			docs: `${consts.DOCS_MIGRATION}#requirecontext`,
		});
	}

	if (envNames.size > 0) {
		const names = [...envNames].sort();
		findings.push({
			id: 'project.process-env',
			level: 'warning',
			title: `process.env variables that are not replaced: ${listNames(names)}`,
			detail: `Only ${REPLACED_ENV_VARS.join(' and ')} are replaced in your components’ code.`,
			files: envFiles,
			fix: 'Add a define entry to viteConfig, or read import.meta.env instead.',
			docs: `${consts.DOCS_MIGRATION}#environment-variables`,
			meta: { variables: names },
		});
	}

	if (oldPackageFiles.length > 0) {
		findings.push({
			id: 'project.old-package',
			// A warning, not an error: this is a text match, and it also fires on a comment or
			// a string that names the old package without importing it
			level: 'warning',
			title: `${plural(oldPackageFiles.length, 'file')} still ${
				oldPackageFiles.length === 1 ? 'mentions' : 'mention'
			} react-styleguidist`,
			files: oldPackageFiles,
			fix: 'Import from vite-styleguidist instead (deep imports keep their path).',
			docs: `${consts.DOCS_MIGRATION}#package-name-in-imports`,
		});
	}

	const webpackConfig = WEBPACK_CONFIG_FILES.map((name) => path.join(configDir, name)).find(
		(file) => fs.existsSync(file)
	);
	const viteConfig = VITE_CONFIG_FILES.map((name) => path.join(configDir, name)).find((file) =>
		fs.existsSync(file)
	);
	if (webpackConfig && !viteConfig) {
		findings.push({
			id: 'project.webpack-config',
			level: 'info',
			title: 'A webpack config is present and there is no Vite config',
			detail: 'The style guide does not need either: Vite handles JS, JSX, TS, CSS and assets.',
			file: webpackConfig,
			fix: 'Move only what you still need: aliases go to moduleAliases, the rest to viteConfig.',
			docs: `${consts.DOCS_MIGRATION}#webpackconfig-and-updatewebpackconfig`,
		});
	}

	return findings;
}
