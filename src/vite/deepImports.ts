import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import createLogger from 'glogg';
import type { Plugin } from 'vite';

const logger = createLogger('rsg');

export const PACKAGE_NAME = 'vite-styleguidist';
export const LEGACY_PACKAGE_NAME = 'react-styleguidist';

/**
 * Printed once, the first time an import of the old package name is served by this one.
 * It is a notice, not a warning: the import works, and the style guide is not misconfigured.
 */
export const LEGACY_PACKAGE_NOTICE = `${LEGACY_PACKAGE_NAME} is not installed; imports of it are served by ${PACKAGE_NAME} — see Migration.md`;

/** Only `lib/` is published (see the `exports` map), and it is all this plugin serves. */
const SERVED_PREFIX = 'lib/';

/** `pkg` → `''`, `pkg/lib/x` → `'lib/x'`, anything else → `undefined`. */
function subpathOf(id: string, name: string): string | undefined {
	if (id === name) {
		return '';
	}
	if (id.startsWith(`${name}/`)) {
		return id.slice(name.length + 1);
	}
	return undefined;
}

const isInside = (dir: string, file: string): boolean => {
	const relative = path.relative(dir, file);
	return !!relative && !relative.startsWith('..') && !path.isAbsolute(relative);
};

/**
 * Is `react-styleguidist` a real dependency of the user’s project?
 *
 * Resolved from the project (`configDir`) only: the first of the two anchors
 * `resolveReactDom()` tries, and deliberately without its fallback to Styleguidist’s own
 * location, because the question here is whether the *user* depends on the old package and
 * our own tree could only ever answer that about ourselves.
 *
 * `react-styleguidist/package.json` is tried first because it resolves whatever the
 * package’s own `exports` map allows (13.x has none, but a fork might); the bare name is
 * the fallback.
 */
export function isLegacyPackageInstalled(configDir: string): boolean {
	const requireFromProject = createRequire(path.join(configDir, 'package.json'));
	for (const request of [`${LEGACY_PACKAGE_NAME}/package.json`, LEGACY_PACKAGE_NAME]) {
		try {
			requireFromProject.resolve(request);
			return true;
		} catch {
			// Not resolvable under that request, try the next one
		}
	}
	return false;
}

export interface DeepImportsOptions {
	/** Absolute path of the running Styleguidist package (the folder holding its package.json). */
	packageDir: string;
	/**
	 * Serve imports of `react-styleguidist` from this package. False when the project really
	 * has the old package installed: a real dependency must win over a compatibility shim.
	 */
	aliasLegacyPackage: boolean;
}

/**
 * Make deep imports of Styleguidist’s own files resolve, whatever name and shape they are
 * written in:
 *
 * - `vite-styleguidist/lib/client/rsg-components/Link` — a folder, which the `exports` map
 *   can no longer serve now that `./lib/*` appends `.js` (that is what makes the
 *   extensionless *file* form work in Node and TypeScript, see the map in package.json);
 * - the same imports in a project that cannot resolve the package name at all (a global or
 *   linked install, the examples in this repository);
 * - `react-styleguidist/...`, so a style guide migrated from 13.x keeps building while its
 *   custom components are moved to the new name one file at a time.
 *
 * It runs as a `post` plugin on purpose: every id that reaches it is one that Vite, the
 * user’s aliases and every other plugin already failed to resolve, so no import that
 * resolves today takes a different path because of it — and `react-styleguidist` imports
 * are only rewritten when the old package is genuinely missing.
 *
 * There is deliberately no config option to turn any of this off. It can only ever turn a
 * hard resolution error into a working import, an installed `react-styleguidist` already
 * disables the rename on its own, and `moduleAliases` (or a `resolve.alias` in the user’s
 * Vite config) is the escape hatch for a project that wants those imports to go somewhere
 * else: aliases are applied before this plugin ever sees the id.
 */
export default function deepImports({
	packageDir,
	aliasLegacyPackage,
}: DeepImportsOptions): Plugin {
	let noticeLogged = false;

	return {
		name: 'rsg:deep-imports',
		enforce: 'post',

		async resolveId(id, importer, options) {
			const legacySubpath = aliasLegacyPackage ? subpathOf(id, LEGACY_PACKAGE_NAME) : undefined;
			const subpath = legacySubpath === undefined ? subpathOf(id, PACKAGE_NAME) : legacySubpath;
			if (subpath === undefined) {
				return null;
			}

			if (legacySubpath !== undefined) {
				if (!noticeLogged) {
					noticeLogged = true;
					logger.info(LEGACY_PACKAGE_NOTICE);
				}
				// Under the current name first: that is the copy every other import of
				// Styleguidist in the same project resolves to, and two copies of the same
				// component in one bundle would break `instanceof`-style identity checks
				const renamed = subpath ? `${PACKAGE_NAME}/${subpath}` : PACKAGE_NAME;
				const resolved = await this.resolve(renamed, importer, { ...options, skipSelf: true });
				if (resolved) {
					return resolved;
				}
			}

			// Last resort: the file inside the package that is running. `subpath` comes from
			// user code, so it is confined to the published `lib/` folder and re-checked after
			// `path.join()` has collapsed any `..` segments.
			if (!subpath.startsWith(SERVED_PREFIX)) {
				return null;
			}
			const file = path.join(packageDir, subpath);
			if (!isInside(packageDir, file) || !fs.existsSync(path.dirname(file))) {
				return null;
			}
			// Through `this.resolve()`, not as a plain id: Vite adds the extension of an
			// extensionless path and the `index.js` of a folder, which is the whole point here
			return this.resolve(file, importer, { ...options, skipSelf: true });
		},
	};
}
