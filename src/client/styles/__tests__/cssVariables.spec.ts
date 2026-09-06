import jss from '../setupjss.js';
import { createVariableStyles } from '../cssVariables.js';
import { COLOR_SCHEME_ATTRIBUTE, light } from '../colorSchemes.js';

const palettes = {
	light: { base: '#333', baseBackground: '#fff' },
	dark: { base: '#ccc', baseBackground: '#000' },
};

describe('cssVariables', () => {
	const css = jss.createStyleSheet(createVariableStyles(palettes)).toString();

	it('should attach the variable sheet on import', () => {
		// The real palette, whatever its current value: this checks attachment, not colours
		expect(document.querySelector('style[data-meta="rsg-color-schemes"]')?.textContent).toContain(
			`--rsg-color-base-background: ${light.baseBackground};`
		);
	});

	// Every selector is wrapped in :where() so the sheet has no specificity and any rule a
	// user writes for the same custom property wins (see cssVariables.ts)
	it('should define the light values on :root, with zero specificity', () => {
		expect(css).toMatch(
			/^:where\(:root\) \{\n {2}color-scheme: light;\n {2}--rsg-color-base: #333;\n {2}--rsg-color-base-background: #fff;\n\}/
		);
	});

	it('should define the dark values for the dark attribute, after :root', () => {
		const dark = `:where([${COLOR_SCHEME_ATTRIBUTE}="dark"]) {\n  color-scheme: dark;\n  --rsg-color-base: #ccc;\n  --rsg-color-base-background: #000;\n}`;
		expect(css).toContain(dark);
		expect(css.indexOf(':where(:root) {')).toBeLessThan(css.indexOf(dark));
	});

	it('should follow the system when no scheme is chosen', () => {
		expect(css).toContain(
			`@media (prefers-color-scheme: dark) {\n  :where(:root:not([${COLOR_SCHEME_ATTRIBUTE}="light"])) {\n    color-scheme: dark;\n    --rsg-color-base: #ccc;`
		);
	});

	it('should not isolate the root rules', () => {
		// jss-plugin-isolate lists every isolated selector in one reset rule
		const reset =
			document.querySelector('style[data-meta="jss-plugin-isolate"]')?.textContent || '';
		expect(reset).not.toContain(':root');
		expect(reset).not.toContain(':where');
		expect(css).not.toContain('isolate');
	});
});
