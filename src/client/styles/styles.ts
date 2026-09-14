import jss from './setupjss.js';
import { color, mq } from './theme.js';

/**
 * Height of the sticky small-screen header, published on `<html>` as a custom property
 * by StyleGuideRenderer once it has measured the header (ADR 0011, QA F1). Everything
 * that scrolls an anchor into view has to clear that header: the `scroll-padding-top`
 * below covers the browser’s own hash navigation, and index.ts subtracts the same
 * offset from its `?id=` scrolling.
 */
export const STICKY_OFFSET_PROPERTY = '--rsg-sticky-offset';

/** Used until the header is measured: 56 px bar + 44 px chip row + the two borders. */
export const STICKY_OFFSET_FALLBACK = 126;

/** Used until the header is measured when there is no table of contents (no chip row). */
export const STICKY_OFFSET_FALLBACK_NO_TOC = 56;

/**
 * The offset currently published on `<html>`, in pixels; 0 on wide screens, where the
 * sidebar does not overlap the content and the property is removed.
 */
export function readStickyOffset(): number {
	const value = document.documentElement.style.getPropertyValue(STICKY_OFFSET_PROPERTY);
	const offset = Number.parseFloat(value);
	return Number.isFinite(offset) ? offset : 0;
}

const styles = {
	// Global styles
	body: {
		isolate: false,
		margin: 0,
		padding: 0,
		minWidth: 0,
		maxWidth: '100%',
		border: 0,
		// The page surface and text colour, so that the area outside the style guide
		// (overscroll, a page shorter than the viewport) matches the colour scheme
		background: color.baseBackground,
		color: color.base,
	},
	// Only under `mq.small` is the sidebar a sticky header that would cover the target
	// of a hash navigation; on wide screens it sits beside the content
	[mq.small]: {
		'@global': {
			html: {
				scrollPaddingTop: `var(${STICKY_OFFSET_PROPERTY}, ${STICKY_OFFSET_FALLBACK}px)`,
			},
		},
	},
};

// Attach styles to body
const { body } = jss.createStyleSheet(styles).attach().classes;
document.body.classList.add(body);
