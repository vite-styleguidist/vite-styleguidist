import type * as Rsg from '../../../typings/index.js';

/**
 * Typography and box styles shared by the editor and its loading placeholder, kept in a module
 * that imports nothing from CodeMirror so the placeholder can be styled from the main bundle.
 *
 * The 1.0 code area: `fontSize.small` (13) on `lineHeight.code` (1.6), `codeBase` on
 * `codeBackground`, the same values the static code blocks (Markdown/Pre) use. The placeholder
 * must use exactly these values to end up the same height as the editor that replaces it,
 * otherwise the page would jump once the chunk arrives.
 */

/**
 * Inner padding of the code area, 14 / 16 on desktop and 12 / 14 on small screens (Main and
 * Mobile artboards). `nested` is for a rule that lives under another selector (Editor.tsx’s
 * `& .cm-editor .cm-content`): the media-query block is a rule of its own for JSS, so it needs
 * its own `isolate: false`, otherwise jss-plugin-isolate resets CodeMirror’s element there.
 */
export const codePadding = ({ space, mq }: Rsg.Theme, { nested = false } = {}) => ({
	padding: [[14, space[2]]],
	[mq.small]: {
		...(nested ? { isolate: false } : {}),
		padding: [[12, 14]],
	},
});

const editorFrame = ({ fontFamily, fontSize, lineHeight, color, borderRadius }: Rsg.Theme) => ({
	fontFamily: fontFamily.monospace,
	fontSize: fontSize.small,
	lineHeight: lineHeight.code,
	color: color.codeBase,
	background: color.codeBackground,
	borderRadius,
});

/**
 * The language badge in the top-right corner of the code area (“JSX”, “TSX”): mono 11 px,
 * uppercase, tracked, in the `light` colour. Absolutely positioned, so the host needs
 * `position: relative`; `pointer-events: none` keeps clicks going to the editor beneath it.
 */
export const editorBadge = ({ fontFamily, color }: Rsg.Theme) => ({
	position: 'absolute',
	top: 10,
	right: 12,
	fontFamily: fontFamily.monospace,
	fontSize: 11,
	lineHeight: 1,
	letterSpacing: '0.04em',
	textTransform: 'uppercase',
	color: color.light,
	pointerEvents: 'none',
	userSelect: 'none',
});

export default editorFrame;
