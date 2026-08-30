import type { Theme } from './RsgTheme.js';

declare global {
	/**
	 * Function used in component tests to generate mocks of JSS class names
	 * (defined in test/setup.ts).
	 */
	var classes: (styles: (theme: Theme) => Record<string, any>) => Record<string, string>;
}
