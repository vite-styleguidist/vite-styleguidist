import * as theme from '../theme.js';
import { light, dark, cssVariableName } from '../colorSchemes.js';

describe('theme', () => {
	it('should expose every colour token as a CSS custom property with the light value as fallback', () => {
		const tokens = Object.keys(light);
		expect(tokens.length).toBeGreaterThanOrEqual(28);
		expect(Object.keys(theme.color)).toEqual(tokens);
		for (const token of tokens) {
			expect(theme.color[token as keyof typeof theme.color]).toBe(
				`var(${cssVariableName(token)}, ${light[token as keyof typeof light]})`
			);
		}
	});

	it('should use the designed light values as fallbacks', () => {
		expect(theme.color.base).toBe('var(--rsg-color-base, #262421)');
		expect(theme.color.baseBackground).toBe('var(--rsg-color-base-background, #fcfbf9)');
		expect(theme.color.link).toBe('var(--rsg-color-link, #0b7285)');
		expect(theme.color.focus).toBe('var(--rsg-color-focus, rgba(11, 114, 133, 0.3))');
	});

	it('should expose the surfaces added with the facelift', () => {
		expect(theme.color.selectedBackground).toBe(
			'var(--rsg-color-selected-background, #e3f1f3)'
		);
		expect(theme.color.errorBackground).toBe('var(--rsg-color-error-background, #fdf3f1)');
		expect(dark.selectedBackground).toBe('#1f3236');
		expect(dark.errorBackground).toBe('#2b1f1d');
	});

	it('should define a dark value for every colour token', () => {
		expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort());
	});

	it('should name custom properties in kebab-case', () => {
		expect(cssVariableName('base')).toBe('--rsg-color-base');
		expect(cssVariableName('sidebarBackground')).toBe('--rsg-color-sidebar-background');
		expect(cssVariableName('codeVariable')).toBe('--rsg-color-code-variable');
	});

	it('should keep numeric tokens numeric', () => {
		expect(theme.space).toEqual([4, 8, 16, 24, 32, 40, 48]);
		expect(Object.values(theme.fontSize).every((value) => typeof value === 'number')).toBe(true);
		expect(typeof theme.borderRadius).toBe('number');
		expect(typeof theme.maxWidth).toBe('number');
		expect(typeof theme.sidebarWidth).toBe('number');
	});

	// The 1.0 design values (Tokens artboard); the component lanes build on these
	it('should ship the 1.0 type scale, radius and sidebar width', () => {
		expect(theme.fontSize).toEqual({
			base: 15,
			text: 16,
			small: 13,
			h1: 40,
			h2: 28,
			h3: 22,
			h4: 18,
			h5: 16,
			h6: 16,
		});
		expect(theme.borderRadius).toBe(6);
		expect(theme.maxWidth).toBe(960);
		expect(theme.sidebarWidth).toBe(232);
		expect(theme.buttonTextTransform).toBe('none');
	});

	it('should ship the tokens for formerly hard-coded values', () => {
		expect(theme.lineHeight).toEqual({ base: 1.55, heading: 1.2, code: 1.6 });
		expect(theme.fontWeight).toEqual({ normal: 400, bold: 600 });
		expect(theme.transition).toEqual({ fast: '150ms ease-in', slow: '750ms ease-out' });
		expect(theme.shadow).toEqual({
			tooltip: '0 2px 4px rgba(0,0,0,.15)',
			ribbon: '0 -1px 0 rgba(0,0,0,.15)',
		});
		expect(theme.mq).toEqual({
			small: '@media (max-width: 600px)',
			medium: '@media (max-width: 1024px)',
		});
	});
});
