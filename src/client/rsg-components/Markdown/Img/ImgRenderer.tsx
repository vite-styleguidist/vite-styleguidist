import React from 'react';
import PropTypes from 'prop-types';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import type * as Rsg from '../../../../typings/index.js';

/*
 * Images in Markdown documents. The one declaration keeps a large image inside the
 * column it is written in; the rule exists mostly so the element carries a JSS class at
 * all: without one, jss-plugin-isolate has nothing to reset and a host page's `img`
 * styles (borders, filters) leak into the style guide, which is what every other
 * Markdown element is protected from. It also gives users a `styles.Img.img` key.
 */
const styles = (_theme: Rsg.Theme) => ({
	img: {
		maxWidth: '100%',
	},
});

type ImgProps = JssInjectedProps & React.ImgHTMLAttributes<HTMLImageElement>;

export const ImgRenderer: React.FunctionComponent<ImgProps> = ({ classes, alt, ...props }) => {
	// `![](src)` leaves `alt` undefined, which reads as "no alternative given" to a screen
	// reader and makes it announce the file name; an empty string is the correct markup for
	// the decorative image the author wrote. Text is never invented here.
	return <img {...props} alt={alt ?? ''} className={classes.img} />;
};

ImgRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	src: PropTypes.string,
	alt: PropTypes.string,
};

export default Styled<ImgProps>(styles)(ImgRenderer);
