import { transformWithOxc } from 'vite';
import type { Plugin } from 'vite';

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
			// Cheap pre-check: nothing that looks like a JSX tag
			if (!/<[A-Za-z>]/.test(code)) {
				return null;
			}
			try {
				const result = await transformWithOxc(code, file, {
					lang: 'jsx',
					jsx: {
						runtime: 'automatic',
						importSource: jsxImportSource,
						development: !isProduction,
					},
				});
				return { code: result.code, map: result.map, moduleType: 'js' };
			} catch {
				// Not JSX after all (e.g. `a < b`), let Vite handle the file as plain JavaScript
				return null;
			}
		},
	};
}
