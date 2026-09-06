import isFunction from 'lodash/isFunction.js';
import {
	COLOR_SCHEMES,
	COLOR_SCHEME_ATTRIBUTE,
	COLOR_SCHEME_CONFIG_ATTRIBUTE,
	COLOR_SCHEME_STORAGE_KEY,
} from '../client/styles/colorSchemes.js';
import type * as Rsg from '../typings/index.js';

/**
 * HTML generation for the style guide page.
 *
 * With webpack, Styleguidist relied on mini-html-webpack-plugin and
 * @vxna/mini-html-webpack-template. To keep the `template` config option
 * backwards compatible, the template’s context format is reimplemented here:
 *
 * ```js
 * template: {
 *   lang: 'en',
 *   favicon: 'favicon.ico',
 *   head: { meta: [{ name: 'x', content: 'y' }], links: [...], scripts: [...], raw: '<style>...</style>' },
 *   body: { raw: '<div id="modal"></div>', scripts: [{ src: 'analytics.js' }] },
 *   attrs: { js: { defer: true }, css: { media: 'all' } },
 *   trimWhitespace: true,
 * }
 * ```
 *
 * A `template` *function* receives the whole context (including `js` and `css`
 * URL arrays) and must return the complete HTML document.
 */

type Attrs = Record<string, string | number | boolean | undefined>;

export interface TemplateContext {
	/** Prefix for asset URLs: empty in development (URLs are root-absolute), './' in production builds. */
	publicPath: string;
	/** `<html lang>` attribute. */
	lang: string;
	title: string;
	/** Id of the element the style guide mounts to (`mountPointId`). */
	container: string;
	/** URLs of JavaScript modules to load. */
	js: string[];
	/** URLs of stylesheets to load. */
	css: string[];
	favicon?: string;
	/** The `colorScheme` config option (`system` when omitted). */
	colorScheme?: Rsg.ColorScheme;
	head?: {
		meta?: Attrs[];
		links?: Attrs[];
		scripts?: Attrs[];
		style?: Attrs[];
		raw?: string | string[];
	};
	body?: {
		raw?: string | string[];
		scripts?: Attrs[];
	};
	attrs?: {
		js?: Attrs;
		css?: Attrs;
	};
	trimWhitespace?: boolean;
	[key: string]: unknown;
}

const renderAttrs = (attrs: Attrs = {}): string =>
	Object.keys(attrs)
		.filter((key) => attrs[key] !== undefined && attrs[key] !== false)
		.map((key) => (attrs[key] === true ? ` ${key}` : ` ${key}="${String(attrs[key])}"`))
		.join('');

const renderTags = (tag: string, items: Attrs[] = [], selfClosing = true): string =>
	items
		.map((attrs) =>
			selfClosing ? `<${tag}${renderAttrs(attrs)}>` : `<${tag}${renderAttrs(attrs)}></${tag}>`
		)
		.join('\n');

const renderRaw = (raw?: string | string[]): string =>
	Array.isArray(raw) ? raw.join('\n') : raw || '';

/**
 * Inline script that applies the colour scheme before the first paint (ADR 0011).
 *
 * It runs in `<head>`, before any stylesheet, so a visitor who chose dark never sees
 * a light frame first. It writes the configured scheme into `<html>` for the
 * ThemeToggle component, then applies the visitor’s stored choice (only when the
 * config leaves the choice open) or the forced scheme as the attribute the variable
 * sheet selects on. `system` means no attribute: the media query decides. Kept
 * dependency-free and ES5 on purpose; the constants are shared with the client code.
 */
export function colorSchemeScript(colorScheme: Rsg.ColorScheme): string {
	return [
		'(function(){',
		`var root=document.documentElement,scheme=${JSON.stringify(colorScheme)};`,
		`root.setAttribute(${JSON.stringify(COLOR_SCHEME_CONFIG_ATTRIBUTE)},scheme);`,
		`if(scheme==="system"){try{scheme=localStorage.getItem(${JSON.stringify(COLOR_SCHEME_STORAGE_KEY)})}catch(error){}}`,
		`if(scheme==="light"||scheme==="dark"){root.setAttribute(${JSON.stringify(COLOR_SCHEME_ATTRIBUTE)},scheme)}`,
		'})()',
	].join('');
}

/** `<meta name="color-scheme">` content: which schemes the page supports. */
const colorSchemeMeta = (colorScheme: Rsg.ColorScheme): string =>
	colorScheme === 'system' ? 'light dark' : colorScheme;

/**
 * Default HTML template (mirrors @vxna/mini-html-webpack-template).
 */
export function defaultTemplate(context: TemplateContext): string {
	const {
		publicPath,
		lang,
		title,
		container,
		favicon,
		colorScheme = 'system',
		head = {},
		body = {},
		attrs = {},
		js,
		css,
	} = context;

	const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="${colorSchemeMeta(colorScheme)}">
<script>${colorSchemeScript(colorScheme)}</script>
<title>${title}</title>
${favicon ? `<link rel="icon" type="image/x-icon" href="${favicon}">` : ''}
${renderTags('meta', head.meta)}
${renderTags('link', head.links)}
${renderTags('style', head.style, false)}
${renderTags('script', head.scripts, false)}
${renderRaw(head.raw)}
${css.map((file) => `<link rel="stylesheet" href="${publicPath}${file}"${renderAttrs(attrs.css)}>`).join('\n')}
</head>
<body>
<div id="${container}"></div>
${renderRaw(body.raw)}
${renderTags('script', body.scripts, false)}
${js.map((file) => `<script type="module" src="${publicPath}${file}"${renderAttrs(attrs.js)}></script>`).join('\n')}
</body>
</html>`;

	return context.trimWhitespace ? html.replace(/\n\s*/g, '') : html.replace(/\n{2,}/g, '\n');
}

/**
 * Render the style guide HTML for the given config and asset URLs.
 */
export default function renderHtml(
	config: Rsg.SanitizedStyleguidistConfig,
	assets: { js: string[]; css: string[]; publicPath: string }
): string {
	const template = isFunction(config.template) ? config.template : defaultTemplate;
	const templateContext = isFunction(config.template) ? {} : config.template;
	const context: TemplateContext = {
		lang: 'en',
		...templateContext,
		title: config.title,
		container: config.mountPointId,
		// The schema validates the option; the guard only covers hand-built configs
		colorScheme: COLOR_SCHEMES.includes(config.colorScheme) ? config.colorScheme : 'system',
		...assets,
	};
	return template(context);
}
