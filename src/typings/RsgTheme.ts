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
		/** Surface of the selected sidebar item and the active tab (since 1.0). */
		selectedBackground: string;
		/** Surface of the playground error panel; `error` is the text on it (since 1.0). */
		errorBackground: string;
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
		/** Code blocks and the editor (1.6 by default) */
		code: number;
	};
	/** 400 and 600 by default; the CSS keywords (`normal`, `bold`) work as well. */
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
		/**
		 * From this width up the `pageNav` rail fits beside the content column (since 1.0,
		 * ADR 0016); below it PageNav renders as a collapsible block. Computed from
		 * `sidebarWidth`, `maxWidth`, `space[6]`, `space[3]` and `pageNavWidth`.
		 */
		large: string;
	};
	borderRadius: number;
	maxWidth: number;
	sidebarWidth: number;
	/** Width of the `pageNav` rail (since 1.0); see `mq.large`. */
	pageNavWidth: number;
	buttonTextTransform: string;
}

/**
 * Colour scheme of the style guide UI: `system` follows `prefers-color-scheme` and
 * shows a toggle, `light` and `dark` force that scheme (ADR 0011). Used by the
 * `colorScheme` config option and stored as the visitor’s choice in localStorage.
 */
export type ColorScheme = 'system' | 'light' | 'dark';
