import React from 'react';
import PropTypes from 'prop-types';
import RibbonRenderer from 'rsg-components/Ribbon/RibbonRenderer';
import { useStyleGuideContext } from 'rsg-components/Context';

interface RibbonProps {
	/** Render as a quiet text link (the sidebar footer) instead of the corner pill */
	inline?: boolean;
}

export default function Ribbon({ inline }: RibbonProps) {
	const {
		config: { ribbon },
	} = useStyleGuideContext();
	return ribbon ? <RibbonRenderer {...ribbon} inline={inline} /> : null;
}

Ribbon.propTypes = {
	inline: PropTypes.bool,
};
