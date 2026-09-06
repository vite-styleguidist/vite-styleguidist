import jss from './setupjss.js';
import { color } from './theme.js';

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
};

// Attach styles to body
const { body } = jss.createStyleSheet(styles).attach().classes;
document.body.classList.add(body);
