import { transformWithOxc } from 'vite';
import type { Plugin } from 'vite';

/** Cheap pre-check: nothing in the file looks like the start of a JSX tag. */
const LOOKS_LIKE_JSX = /<[A-Za-z>]/;

interface CompileOptions {
	development: boolean;
	importSource?: string;
}

/**
 * Compile the JSX in a `.js` file with Oxc, or return `undefined` when the file turns out not
 * to be JSX after all (e.g. `a < b` tripped the pre-check above).
 */
async function compileJsx(
	code: string,
	file: string,
	{ development, importSource }: CompileOptions
) {
	if (!LOOKS_LIKE_JSX.test(code)) {
		return undefined;
	}
	try {
		return await transformWithOxc(code, file, {
			lang: 'jsx',
			jsx: {
				runtime: 'automatic',
				importSource,
				development,
			},
		});
	} catch {
		return undefined;
	}
}

/**
 * Compile JSX in `.js` files.
 *
 * Vite only handles JSX in `.jsx`/`.tsx` files, but many React projects (and most
 * Styleguidist users, historically) keep JSX in `.js` files. This `pre` plugin
 * transforms such files with Oxc in JSX mode; files that turn out not to be JSX
 * are left for Vite’s regular pipeline. Files in node_modules are skipped:
 * dependencies are pre-bundled by Vite, which handles JSX in `.js` on its own.
 *
 * Fast Refresh is intentionally NOT applied here: @vitejs/plugin-react’s own pass
 * (whose `include` covers `.js`) adds it afterwards — doing it in both passes
 * duplicates the `$RefreshReg$` bookkeeping in every module.
 */
export default function jsxInJs(): Plugin {
	let isProduction = false;
	let jsxImportSource: string | undefined;
	return {
		name: 'rsg:jsx-in-js',
		enforce: 'pre',
		configResolved(config) {
			isProduction = config.isProduction;
			// Keep `.js` files consistent with `.jsx` when the user configured a
			// custom JSX import source (e.g. @emotion/react)
			jsxImportSource = (config as any).oxc?.jsx?.importSource;
		},
		async transform(code, id) {
			const file = id.split('?')[0];
			if (!file.endsWith('.js') || file.includes('/node_modules/')) {
				return null;
			}
			const result = await compileJsx(code, file, {
				development: !isProduction,
				importSource: jsxImportSource,
			});
			if (!result) {
				return null;
			}
			return { code: result.code, map: result.map, moduleType: 'js' };
		},
	};
}

/**
 * The same compilation, for Vite’s dependency scanner, and only for `.js` files that use
 * `import.meta.glob()`.
 *
 * The scanner runs its own rolldown pass in which our plugins above do not apply, so
 * `optimizeDeps.rolldownOptions.moduleTypes` tells it to parse `.js` as JSX (see
 * make-vite-config). That module type is lost for a file the scanner has to rewrite first:
 * Vite’s `vite:dep-scan:transform:js-glob` hook expands `import.meta.glob()` and returns the
 * result as `moduleType: 'js'`, so a component that keeps its glob next to its JSX — the
 * shape a migrator lands on when replacing `require.context()`, which is what
 * docs/Migration.md and `styleguidist doctor` tell them to do — fails to parse. The scan then
 * gives up with “Failed to run dependency scan. Skipping dependency pre-bundling”, and a
 * style guide served without pre-bundled dependencies is a blank page whose only symptom is a
 * console error about a CommonJS file in node_modules the user never wrote.
 *
 * Running first in the scanner’s pipeline turns that file into plain JavaScript before the
 * glob hook sees it. Deliberately narrow: files without `import.meta.glob` are left to the
 * `moduleTypes` above exactly as before, so the scan of an ordinary project is unchanged.
 *
 * Typed structurally rather than with rolldown’s `Plugin` — rolldown is Vite’s dependency,
 * not ours, and this is the only place we hand a plugin to it.
 */
export function scanGlobJsxInJs(options: { development: boolean; importSource?: string }) {
	return {
		name: 'rsg:scan-glob-jsx-in-js',
		async transform(code: string, id: string) {
			const file = id.split('?')[0];
			if (!file.endsWith('.js') || file.includes('/node_modules/')) {
				return null;
			}
			// The scanner only rewrites files that mention it, so only those can lose the type
			if (!code.includes('import.meta.glob')) {
				return null;
			}
			const result = await compileJsx(code, file, options);
			if (!result) {
				return null;
			}
			return { code: result.code, map: result.map, moduleType: 'js' as const };
		},
	};
}
