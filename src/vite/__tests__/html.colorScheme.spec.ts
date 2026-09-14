import renderHtml, { defaultTemplate, colorSchemeScript } from '../html.js';
import type { TemplateContext } from '../html.js';
import {
	COLOR_SCHEME_ATTRIBUTE,
	COLOR_SCHEME_CONFIG_ATTRIBUTE,
	COLOR_SCHEME_STORAGE_KEY,
} from '../../client/styles/colorSchemes.js';
import type * as Rsg from '../../typings/index.js';

const baseContext: TemplateContext = {
	publicPath: './',
	lang: 'en',
	title: 'Pizza Style Guide',
	container: 'rsg-root',
	js: ['build/bundle.abc123.js'],
	css: [],
};

const config = {
	title: 'Pizza Style Guide',
	mountPointId: 'rsg-root',
	template: {},
} as Rsg.SanitizedStyleguidistConfig;

/** Run the inline script against a fresh <html> element as if it were the page */
function runScript(script: string, stored: string | null) {
	const root = document.documentElement;
	root.removeAttribute(COLOR_SCHEME_ATTRIBUTE);
	root.removeAttribute(COLOR_SCHEME_CONFIG_ATTRIBUTE);
	window.localStorage.clear();
	if (stored !== null) {
		window.localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, stored);
	}
	new Function(script)();
	return {
		applied: root.getAttribute(COLOR_SCHEME_ATTRIBUTE),
		configured: root.getAttribute(COLOR_SCHEME_CONFIG_ATTRIBUTE),
	};
}

describe('color scheme in the default template', () => {
	it('should declare both schemes and apply the stored choice by default', () => {
		const html = defaultTemplate(baseContext);
		expect(html).toMatch('<meta name="color-scheme" content="light dark">');
		expect(html).toMatch(`<script>${colorSchemeScript('system')}</script>`);
		// Before the title and any stylesheet, so it runs before the first paint
		expect(html.indexOf('<script>')).toBeLessThan(html.indexOf('<title>'));
	});

	it('should declare only the forced scheme', () => {
		expect(defaultTemplate({ ...baseContext, colorScheme: 'dark' })).toMatch(
			'<meta name="color-scheme" content="dark">'
		);
		expect(defaultTemplate({ ...baseContext, colorScheme: 'light' })).toMatch(
			'<meta name="color-scheme" content="light">'
		);
	});

	it('should survive trimWhitespace', () => {
		const html = defaultTemplate({ ...baseContext, colorScheme: 'dark', trimWhitespace: true });
		expect(html).toMatch(`<script>${colorSchemeScript('dark')}</script>`);
	});

	it('should take the scheme from the config and fall back to system for garbage', () => {
		expect(renderHtml({ ...config, colorScheme: 'dark' }, { ...baseContext })).toMatch(
			'content="dark"'
		);
		expect(renderHtml({ ...config, colorScheme: 'sepia' as any }, { ...baseContext })).toMatch(
			'content="light dark"'
		);
		expect(renderHtml(config, { ...baseContext })).toMatch('content="light dark"');
	});

	it('should hand the scheme to template functions', () => {
		const template = vi.fn(() => '<html></html>');
		renderHtml({ ...config, colorScheme: 'light', template }, { ...baseContext });
		expect(template).toHaveBeenCalledWith(expect.objectContaining({ colorScheme: 'light' }));
	});
});

describe('colorSchemeScript', () => {
	afterAll(() => {
		document.documentElement.removeAttribute(COLOR_SCHEME_ATTRIBUTE);
		document.documentElement.removeAttribute(COLOR_SCHEME_CONFIG_ATTRIBUTE);
		window.localStorage.clear();
	});

	it('should leave the attribute off for the system default', () => {
		expect(runScript(colorSchemeScript('system'), null)).toEqual({
			applied: null,
			configured: 'system',
		});
	});

	it('should apply the stored choice when the config leaves it open', () => {
		expect(runScript(colorSchemeScript('system'), 'dark').applied).toBe('dark');
		expect(runScript(colorSchemeScript('system'), 'light').applied).toBe('light');
		expect(runScript(colorSchemeScript('system'), 'system').applied).toBe(null);
		expect(runScript(colorSchemeScript('system'), 'sepia').applied).toBe(null);
	});

	it('should apply a forced scheme regardless of the stored choice', () => {
		expect(runScript(colorSchemeScript('dark'), 'light')).toEqual({
			applied: 'dark',
			configured: 'dark',
		});
		expect(runScript(colorSchemeScript('light'), 'dark').applied).toBe('light');
	});

	it('should not need storage', () => {
		const getItem = vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
			throw new Error('SecurityError');
		});
		expect(runScript(colorSchemeScript('system'), null).applied).toBe(null);
		getItem.mockRestore();
	});
});
