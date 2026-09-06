import { light, dark } from '../colorSchemes.js';
import type { ColorToken } from '../colorSchemes.js';

/*
 * Contrast guard for the designed palettes (ADR 0011: every text/surface pair the
 * components put together at 4.5:1 or better, WCAG 2 AA for normal text).
 *
 * The ratio is computed locally rather than with a dependency: WCAG 2.x relative
 * luminance (sRGB channels linearised, weighted 0.2126 / 0.7152 / 0.0722) and
 * (L1 + 0.05) / (L2 + 0.05). Only opaque hex colours are measured; `focus` is a
 * translucent ring, not a text colour, and `lightest` / `border` are decorative.
 */

const channel = (value: number) => {
	const c = value / 255;
	return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string) => {
	const match = /^#([0-9a-f]{6})$/i.exec(hex);
	if (!match) {
		throw new Error(`Expected an opaque 6-digit hex colour, got ${hex}`);
	}
	const rgb = parseInt(match[1], 16);
	return (
		0.2126 * channel((rgb >> 16) & 255) +
		0.7152 * channel((rgb >> 8) & 255) +
		0.0722 * channel(rgb & 255)
	);
};

const contrastRatio = (foreground: string, background: string) => {
	const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
	return (lighter + 0.05) / (darker + 0.05);
};

const AA = 4.5;

const textTokens: ColorToken[] = ['base', 'light', 'link', 'linkHover', 'name', 'type', 'error'];
const codeTokens = (Object.keys(light) as ColorToken[]).filter(
	(token) => token.startsWith('code') && token !== 'codeBackground'
);

describe('colorSchemes contrast', () => {
	it('should compute WCAG 2 contrast ratios', () => {
		expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
		expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5);
		expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
	});

	describe.each([
		['light', light],
		['dark', dark],
	])('%s scheme', (_scheme, palette) => {
		it.each(textTokens)('%s should reach AA on baseBackground and sidebarBackground', (token) => {
			expect(contrastRatio(palette[token], palette.baseBackground)).toBeGreaterThanOrEqual(AA);
			expect(contrastRatio(palette[token], palette.sidebarBackground)).toBeGreaterThanOrEqual(AA);
		});

		// Includes codeComment: comments are read, not decoration
		it.each(codeTokens)('%s should reach AA on codeBackground', (token) => {
			expect(contrastRatio(palette[token], palette.codeBackground)).toBeGreaterThanOrEqual(AA);
		});

		it('ribbonText should reach AA on ribbonBackground', () => {
			expect(contrastRatio(palette.ribbonText, palette.ribbonBackground)).toBeGreaterThanOrEqual(AA);
		});

		it('error should reach AA on errorBackground', () => {
			expect(contrastRatio(palette.error, palette.errorBackground)).toBeGreaterThanOrEqual(AA);
		});

		// Not in the brief, but the selected sidebar item and active tab carry these two
		it('base and link should reach AA on selectedBackground', () => {
			expect(contrastRatio(palette.base, palette.selectedBackground)).toBeGreaterThanOrEqual(AA);
			expect(contrastRatio(palette.link, palette.selectedBackground)).toBeGreaterThanOrEqual(AA);
		});
	});
});
