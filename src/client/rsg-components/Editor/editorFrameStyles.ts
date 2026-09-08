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
 * Room the badge takes out of the code area’s right edge on desktop: its 12 px offset from the
 * frame, room for a four-character label (11 px mono, ≈ 28 px; “JSX” measures 21) and an 8 px
 * gap, so the first line of code never runs under it. A fence language with no short spelling
 * is shown as written and can be wider than that — it would overlap the very end of a full
 * first row, the way it did for every label before this gutter. Under `mq.small` there is no
 * badge (Mobile artboard) and no gutter.
 */
const badgeGutter = 12 + 28 + 8;

/**
 * Inner padding of the code area, 14 / 16 on desktop and 12 / 14 on small screens (Main and
 * Mobile artboards), plus the badge’s gutter on the right. `nested` is for a rule that lives
 * under another selector (Editor.tsx’s `& .cm-editor .cm-content`): the media-query block is a
 * rule of its own for JSS, so it needs its own `isolate: false`, otherwise jss-plugin-isolate
 * resets CodeMirror’s element there.
 */
export const codePadding = ({ space, mq }: Rsg.Theme, { nested = false } = {}) => ({
	padding: [[14, space[2]]],
	paddingRight: badgeGutter,
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
export const editorBadge = ({ fontFamily, color, mq }: Rsg.Theme) => ({
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
	// The Mobile artboard has no badge: the code area is narrow enough that the label would
	// eat a tenth of every line’s width for no information the fence language doesn’t give
	[mq.small]: {
		display: 'none',
	},
});

export default editorFrame;
