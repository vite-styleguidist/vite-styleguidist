/**
 * When the theme is to be used in a component,
 * it will have all it's values set.
 * None of those declarations should be optional.
 *
 * Token names are append-only (ADR 0011): new tokens are added next to the existing
 * ones, never renamed, so every `theme` and `styles` config in the wild keeps working.
 * Colour tokens hold `var(--rsg-color-<name>, <light value>)` strings, see
 * src/client/styles/theme.ts.
 */
export interface Theme {
	spaceFactor: number;
	space: number[];
	color: {
		base: string;
		light: string;
		lightest: string;
		link: string;
		linkHover: string;
		focus: string;
		border: string;
		name: string;
		type: string;
		error: string;
		baseBackground: string;
		codeBackground: string;
		sidebarBackground: string;
		ribbonBackground: string;
		ribbonText: string;
		// Based on default Prism theme
		codeBase: string;
		codeComment: string;
		codePunctuation: string;
		codeProperty: string;
		codeDeleted: string;
		codeString: string;
		codeInserted: string;
		codeOperator: string;
		codeKeyword: string;
		codeFunction: string;
		codeVariable: string;
	};
	fontFamily: {
		base: string[];
		monospace: string[];
	};
	fontSize: {
		base: number;
		text: number;
		small: number;
		h1: number;
		h2: number;
		h3: number;
		h4: number;
		h5: number;
		h6: number;
	};
	/** Unitless line heights: `base` for running text, `heading` for headings. */
	lineHeight: {
		base: number;
		heading: number;
	};
	/** `normal` and `bold` by default; a number (400, 700) works as well. */
	fontWeight: {
		normal: string | number;
		bold: string | number;
	};
	/** Duration and easing (without the property): `transition: \`color ${transition.fast}\`` */
	transition: {
		fast: string;
		slow: string;
	};
	/** Complete shadow values: `boxShadow: shadow.tooltip`, `textShadow: shadow.ribbon` */
	shadow: {
		tooltip: string;
		ribbon: string;
	};
	/** Media queries, usable as keys of a JSS rule: `[mq.small]: { … }` */
	mq: {
		small: string;
		medium: string;
	};
	borderRadius: number;
	maxWidth: number;
	sidebarWidth: number;
	buttonTextTransform: string;
}
