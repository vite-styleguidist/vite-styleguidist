import jss from '../setupjss.js';
import { createVariableStyles, COLOR_SCHEME_ATTRIBUTE } from '../cssVariables.js';

const palettes = {
	light: { base: '#333', baseBackground: '#fff' },
	dark: { base: '#ccc', baseBackground: '#000' },
};

describe('cssVariables', () => {
	const css = jss.createStyleSheet(createVariableStyles(palettes)).toString();

	it('should attach the variable sheet on import', () => {
		expect(document.querySelector('style[data-meta="rsg-color-schemes"]')?.textContent).toContain(
			'--rsg-color-base-background: #fff;'
		);
	});

	it('should define the light values on :root', () => {
		expect(css).toMatch(
			/^:root \{\n {2}color-scheme: light;\n {2}--rsg-color-base: #333;\n {2}--rsg-color-base-background: #fff;\n\}/
		);
	});

	it('should define the dark values for the dark attribute, after :root', () => {
		const dark = `[${COLOR_SCHEME_ATTRIBUTE}="dark"] {\n  color-scheme: dark;\n  --rsg-color-base: #ccc;\n  --rsg-color-base-background: #000;\n}`;
		expect(css).toContain(dark);
		expect(css.indexOf(':root {')).toBeLessThan(css.indexOf(dark));
	});

	it('should follow the system when no scheme is chosen', () => {
		expect(css).toContain(
			`@media (prefers-color-scheme: dark) {\n  :root:not([${COLOR_SCHEME_ATTRIBUTE}="light"]) {\n    color-scheme: dark;\n    --rsg-color-base: #ccc;`
		);
	});

	it('should not isolate the root rules', () => {
		// jss-plugin-isolate lists every isolated selector in one reset rule
		const reset =
			document.querySelector('style[data-meta="jss-plugin-isolate"]')?.textContent || '';
		expect(reset).not.toContain(':root');
		expect(css).not.toContain('isolate');
	});
});
