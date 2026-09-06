import merge from 'lodash/merge.js';
import memoize from 'lodash/memoize.js';
import { Styles, StyleSheet } from 'jss';
import jss, { createSheetGenerateId, getSheetSuffix } from './setupjss.js';
import * as theme from './theme.js';
import { RecursivePartial } from '../../typings/RecursivePartial.js';
import type * as Rsg from '../../typings/index.js';

type StylesFactory = (t: Rsg.Theme) => Styles<string>;

/**
 * `componentName` is derived from the renderer’s function name (Styled.tsx) and is
 * the key users address in the `styles` option, so it is NOT unique: the props
 * `TableRenderer` and the Markdown `TableRenderer` are both `Table`. The cache used to
 * be keyed by name alone, so whichever table mounted first handed its classes to the
 * other. Each `styles` factory is a distinct module-level function, which makes it a
 * stable stand-in for the component’s identity; the number is only used in cache keys,
 * never in class names, so its allocation order does not matter.
 */
const stylesIds = new WeakMap<StylesFactory, number>();
let nextStylesId = 0;
const getStylesId = (styles: StylesFactory): number => {
	let id = stylesIds.get(styles);
	if (id === undefined) {
		id = nextStylesId++;
		stylesIds.set(styles, id);
	}
	return id;
};

const getIdentity = (styles: StylesFactory, componentName: string) =>
	`${componentName}#${getStylesId(styles)}`;

/**
 * By default lodash/memoize only uses the first argument
 * for cache rendering. It works well if the first prameter
 * is enough.
 * We are Hot Module Replacing (HMR) stylesheets.
 * Therefore, we cannot cache stylesheet only by component.
 * We need to add cssRevisions to the key fo when the css files update,
 * the revision will update and we should update the stylesheet.
 */
const createSheet = memoize(
	(
		styles: StylesFactory,
		config: Rsg.ProcessedStyleguidistCSSConfig,
		componentName: string,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		cssRevision: string
	): StyleSheet<string> => {
		const mergedTheme = merge<RecursivePartial<Rsg.Theme>, Rsg.Theme, RecursivePartial<Rsg.Theme>>(
			{},
			theme,
			config.theme
		);

		const customStyles =
			typeof config.styles === 'function' ? config.styles(mergedTheme) : config.styles;

		const mergedStyles: Styles<string> = merge(
			{},
			styles(mergedTheme),
			customStyles && customStyles[componentName]
		);

		// Class-name suffix: the component name plus its rule keys (sorted, so reordering
		// rules in the source is not a change). Two same-named components (the Table case
		// above) differ in their keys and therefore in their class names; two same-named
		// components with identical keys would be indistinguishable for the `styles`
		// option anyway and are reported by getSheetSuffix().
		const identity = `${componentName}(${Object.keys(mergedStyles).sort().join(',')})`;

		return jss.createStyleSheet(mergedStyles, {
			meta: componentName,
			link: true,
			generateId: createSheetGenerateId(getSheetSuffix(identity)),
		});
	},
	// calculate the cache key here
	(styles, config, componentName, cssRevision) =>
		`${getIdentity(styles, componentName)}_${cssRevision}`
);

// Latest sheet handed out per component identity, across revisions
const currentSheets = new Map<string, StyleSheet<string>>();

/**
 * Create (or reuse) the style sheet of a Styled component.
 *
 * Sheets of different revisions of the same component generate the same class names
 * (the suffix does not depend on the revision), so when hot module replacement moves
 * a component to a new revision the previous sheet must be detached or both sheets
 * would apply to the same elements and a removed declaration would linger. This is
 * also why the bookkeeping sits outside the memoized function: going back to an
 * earlier revision is a cache hit that must still detach the sheet in between.
 * Styled() attaches the returned sheet itself, so re-attaching a cached sheet works.
 */
export default function createStyleSheet(
	styles: StylesFactory,
	config: Rsg.ProcessedStyleguidistCSSConfig,
	componentName: string,
	cssRevision: string
): StyleSheet<string> {
	const sheet = createSheet(styles, config, componentName, cssRevision);
	const identity = getIdentity(styles, componentName);
	const previous = currentSheets.get(identity);
	if (previous && previous !== sheet) {
		previous.detach();
	}
	currentSheets.set(identity, sheet);
	return sheet;
}
