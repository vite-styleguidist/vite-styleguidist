import * as theme from '../theme.js';
import { light, dark, cssVariableName } from '../colorSchemes.js';

describe('theme', () => {
	it('should expose every colour token as a CSS custom property with the light value as fallback', () => {
		const tokens = Object.keys(light);
		expect(tokens.length).toBeGreaterThanOrEqual(26);
		expect(Object.keys(theme.color)).toEqual(tokens);
		for (const token of tokens) {
			expect(theme.color[token as keyof typeof theme.color]).toBe(
				`var(${cssVariableName(token)}, ${light[token as keyof typeof light]})`
			);
		}
	});

	it('should keep the light values the style guide always shipped with', () => {
		expect(theme.color.base).toBe('var(--rsg-color-base, #333)');
		expect(theme.color.baseBackground).toBe('var(--rsg-color-base-background, #fff)');
		expect(theme.color.focus).toBe('var(--rsg-color-focus, rgba(22, 115, 177, 0.25))');
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
		expect(theme.space.every((value) => typeof value === 'number')).toBe(true);
		expect(Object.values(theme.fontSize).every((value) => typeof value === 'number')).toBe(true);
		expect(typeof theme.borderRadius).toBe('number');
		expect(typeof theme.maxWidth).toBe('number');
		expect(typeof theme.sidebarWidth).toBe('number');
	});

	it('should ship the tokens for formerly hard-coded values with those exact values', () => {
		expect(theme.lineHeight).toEqual({ base: 1.5, heading: 1.2 });
		expect(theme.fontWeight).toEqual({ normal: 'normal', bold: 'bold' });
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
