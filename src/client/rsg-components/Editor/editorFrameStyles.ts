import type * as Rsg from '../../../typings/index.js';

/**
 * Typography and box styles shared by the editor and its loading placeholder, kept in a module
 * that imports nothing from CodeMirror so the placeholder can be styled from the main bundle.
 *
 * `fontSize.small` and the 1.5 line height match static code blocks (Markdown/Pre/PreRenderer)
 * and the previous editor; the placeholder must use exactly these values to end up the same
 * height as the editor that replaces it, otherwise the page would jump once the chunk arrives.
 */
const editorFrame = ({ fontFamily, fontSize, color, borderRadius }: Rsg.Theme) => ({
	fontFamily: fontFamily.monospace,
	fontSize: fontSize.small,
	lineHeight: 1.5,
	color: color.codeBase,
	background: color.codeBackground,
	borderRadius,
});

export default editorFrame;
