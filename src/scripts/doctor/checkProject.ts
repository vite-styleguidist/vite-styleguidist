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

/**
 * Name prefixes the config exposes to the bundle with the `envPrefix` option: a variable whose
 * name starts with one of them *is* replaced (see getEnvDefine() in make-vite-config.ts), so
 * the scan below must not report it as one of the lost ones.
 *
 * The schema normalizes the option to an array of strings, but the doctor also runs on configs
 * that failed validation and were never normalized, so a bare string is read here too, and
 * anything else is ignored — the schema reports it as a type error of its own.
 */
export function collectEnvPrefixes(config: Partial<Rsg.SanitizedStyleguidistConfig>): string[] {
	const value: unknown = config.envPrefix;
	if (typeof value === 'string') {
		return value === '' ? [] : [value];
	}
	if (Array.isArray(value)) {
		return value.filter((prefix): prefix is string => typeof prefix === 'string' && prefix !== '');
	}
	return [];
}

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
// The module a file imports: `from '…'`, `import '…'` and `import('…')` all end up here.
// Deliberately loose — a match is only ever used to look for a file that exists, and the
// finding needs that file to contain CommonJS too, so a stray match costs a stat and nothing else.
const IMPORT_SOURCE = /\b(?:from|import)\s*\(?\s*['"]([^'"\n]+)['"]/g;
// Comments, removed before the regex above runs so an import somebody commented out is not
// followed. The lookbehind keeps `https://…` inside a string from starting a comment; the
// worst a mis-strip can do is hide an import, which costs a finding, never invents one.
const COMMENTS = /\/\*[\s\S]*?\*\/|(?<![:\\])\/\/[^\n]*/g;
const PROCESS_ENV_DOT = /process\.env\.([A-Za-z_$][\w$]*)/g;
const PROCESS_ENV_INDEX = /process\.env\[\s*['"]([^'"]+)['"]\s*\]/g;
// Any string literal naming the old package: an import, a `require()`, a jest mock, an alias
const OLD_PACKAGE = /['"]react-styleguidist(?:\/[^'"]*)?['"]/;

/** Every distinct `components` value in the config, including the ones nested in sections. */
export function collectComponentPatterns(config: Partial<Rsg.SanitizedStyleguidistConfig>) {
	const patterns: NonNullable<Rsg.SanitizedStyleguidistConfig['components']>[] = [];
	const seen = new Set<unknown>();
	// A string pattern is deduped by value, an array or a function by identity — which is
	// exactly what the schema produces below, the same value in two places
	const add = (pattern: NonNullable<Rsg.SanitizedStyleguidistConfig['components']>) => {
		if (seen.has(pattern)) {
			return;
		}
		seen.add(pattern);
		patterns.push(pattern);
	};
	const walk = (sections?: Rsg.ConfigSection[]) => {
		for (const section of sections || []) {
			if (section.components) {
				add(section.components);
			}
			walk(section.sections);
		}
	};
	// `sections` already contains `components` as its first section (see the schema), but a
	// config that failed validation may not have been normalized, so take both. Deduping is
	// not cosmetic: a pattern kept twice is resolved twice, so a `components` option that
	// cannot be resolved is reported twice and “Found N errors” counts one problem as two.
	if (config.components) {
		add(config.components);
	}
	walk(config.sections);
	return patterns;
}

/**
 * The file a module path points at, or undefined when it points at no file of this project
 * (a package name, a component object written inline, a path that no longer exists).
 *
 * `styleguideComponents` values are written like imports — `./styleguide/Link`,
 * `path.join(__dirname, 'src/styleguide/Link')` — so the extension is usually missing and the
 * target may be a folder with an index file. Resolving them the way an import does is what
 * makes them scannable at all.
 */
export function resolveModuleFile(specifier: string, fromDir: string): string | undefined {
	const base = path.resolve(fromDir, specifier);
	const candidates = [
		base,
		...CODE_EXTENSIONS.map((extension) => base + extension),
		...CODE_EXTENSIONS.map((extension) => path.join(base, `index${extension}`)),
	];
	for (const candidate of candidates) {
		try {
			if (fs.statSync(candidate).isFile()) {
				return candidate;
			}
		} catch {
			// Not this one, keep probing
		}
	}
	return undefined;
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
	// The renderer overrides of `styleguideComponents` and the string values of
	// `mdxComponents` are project files that go into the browser bundle exactly like
	// components do (an alias and an import, see make-vite-config and vite/modules), and
	// Migration.md singles the first out as *the* deep-import case — so they have to be
	// scanned too. Values that name a package rather than a file, and mdxComponents entries
	// holding a real component, resolve to nothing and are skipped.
	const overrides: unknown[] = [
		...Object.values(config.styleguideComponents || {}),
		...Object.values(config.mdxComponents || {}),
	];
	for (const value of overrides) {
		if (typeof value === 'string') {
			const file = resolveModuleFile(value, configDir);
			if (file) {
				files.push(file);
			}
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
 * The `name` → `absolute path` import aliases the style guide will be built with, as far as
 * the config knows them: the `moduleAliases` option and, when `viteConfig` is written as an
 * object, its `resolve.alias` entries. A RegExp alias, a function `viteConfig` and the
 * project’s own `vite.config.js` are out of reach here — an alias that is not found simply
 * means one import is not followed.
 */
export function collectImportAliases(
	config: Partial<Rsg.SanitizedStyleguidistConfig>
): [string, string][] {
	const aliases = Object.entries(config.moduleAliases || {});
	const viteConfig = config.viteConfig as
		{ resolve?: { alias?: unknown } } | ((...args: unknown[]) => unknown) | undefined;
	const alias =
		viteConfig && typeof viteConfig === 'object' ? viteConfig.resolve?.alias : undefined;
	if (Array.isArray(alias)) {
		for (const entry of alias) {
			aliases.push([entry?.find, entry?.replacement]);
		}
	} else if (alias && typeof alias === 'object') {
		aliases.push(...Object.entries(alias));
	}
	return aliases.filter(
		(entry): entry is [string, string] =>
			typeof entry[0] === 'string' && typeof entry[1] === 'string'
	);
}

/**
 * Where an import of `file` points, when it points at another file of this project.
 *
 * Only relative specifiers and the ones going through `moduleAliases` are followed: a bare
 * package name is a dependency, which Vite pre-bundles (and converts from CommonJS on the way)
 * whatever it is written in.
 */
export function resolveImport(
	specifier: string,
	fromDir: string,
	aliases: [string, string][]
): string | undefined {
	if (specifier.startsWith('.')) {
		return resolveModuleFile(specifier, fromDir);
	}
	for (const [name, target] of aliases) {
		if (specifier === name || specifier.startsWith(`${name}/`)) {
			return resolveModuleFile(target + specifier.slice(name.length), fromDir);
		}
	}
	return undefined;
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
	// Absolute paths of the project files the scanned ones import, checked for CommonJS below
	const importedFiles = new Set<string>();
	const importAliases = collectImportAliases(config);
	const requireContextFiles: string[] = [];
	const oldPackageFiles: string[] = [];
	const envFiles: string[] = [];
	const envNames = new Set<string>();
	const envPrefixes = collectEnvPrefixes(config);

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
				const name = match[1];
				const replaced =
					REPLACED_ENV_VARS.includes(name) || envPrefixes.some((prefix) => name.startsWith(prefix));
				if (!replaced) {
					envNames.add(name);
					found = true;
				}
				match = regexp.exec(code);
			}
		}
		if (found) {
			envFiles.push(file);
		}

		const importable = code.replace(COMMENTS, '');
		IMPORT_SOURCE.lastIndex = 0;
		let importMatch = IMPORT_SOURCE.exec(importable);
		while (importMatch) {
			const imported = resolveImport(importMatch[1], path.dirname(file), importAliases);
			// Dependencies are Vite’s business, and a file that is scanned in its own right is
			// covered by the checks above
			if (imported && !imported.includes(`${path.sep}node_modules${path.sep}`)) {
				importedFiles.add(imported);
			}
			importMatch = IMPORT_SOURCE.exec(importable);
		}
	}

	/**
	 * CommonJS one import away from a file that is bundled: an ES module theme (the fix the
	 * report above asks for) that still imports a `module.exports` helper, or a component that
	 * does. Worth its own pass because dev and build disagree about it — the build converts the
	 * file, the dev server serves it as it is and the page stays blank with a single console
	 * error naming a file the user did not think was part of the style guide.
	 *
	 * Only one level deep, and only files nothing else already scanned: this is a migration
	 * aid, not a module graph. `.cjs`/`.cts` are left out on purpose — a file with that
	 * extension is deliberate CommonJS, and Vite has its own interop for it.
	 */
	const cjsImportedFiles: string[] = [];
	const importedTargets = [...importedFiles]
		.filter(
			(file) =>
				!scanned.includes(file) &&
				CODE_EXTENSIONS.includes(path.extname(file)) &&
				!['.cjs', '.cts'].includes(path.extname(file))
		)
		.sort()
		.slice(0, Math.max(0, maxFiles - scanned.length));
	for (const file of importedTargets) {
		try {
			if (fs.statSync(file).size > maxFileSize) {
				continue;
			}
			const code = fs.readFileSync(file, 'utf8');
			if (CJS_EXPORTS.test(code) || CJS_REQUIRE.test(code)) {
				cjsImportedFiles.push(file);
			}
		} catch {
			// Unreadable: not something a migration report should stop for
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

	if (cjsImportedFiles.length > 0) {
		findings.push({
			id: 'project.commonjs-import',
			level: 'error',
			title: `CommonJS syntax in ${plural(cjsImportedFiles.length, 'imported file')}`,
			detail:
				'Your theme, styles or components import these, so they are bundled for the browser and must be ES modules. ' +
				'A build converts them anyway, the dev server does not: it serves a blank page with one console error naming the file.',
			files: cjsImportedFiles,
			fix: 'Replace module.exports with export default, and require() with import.',
			docs: `${consts.DOCS_MIGRATION}#commonjs-in-your-project-files`,
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
			// The second sentence only appears when the option is set: with no envPrefix there is
			// nothing to say about it here, and the fix line below already names it
			detail:
				`Only ${REPLACED_ENV_VARS.join(' and ')} are replaced in your components’ code.` +
				(envPrefixes.length > 0
					? ` Your envPrefix option adds ${listNames(envPrefixes)}, which these names do not start with.`
					: ''),
			files: envFiles,
			fix: 'Add their prefix to the envPrefix option, add a define entry to viteConfig, or read import.meta.env instead.',
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
