import React from 'react';
import PropTypes from 'prop-types';
import { MdCloseFullscreen, MdOpenInFull } from 'react-icons/md';
import ToolbarButton from 'rsg-components/ToolbarButton';
import getUrl from '../../utils/getUrl.js';

export interface IsolateButtonProps {
	name: string;
	example?: number;
	isolated?: boolean;
	href: string;
}

const IsolateButton = ({ name, example, isolated, href }: IsolateButtonProps) => {
	if (isolated && !href) {
		return null;
	}

	const testID = example ? `${name}-${example}-isolate-button` : `${name}-isolate-button`;
	// The example toolbar spells the action out next to the icon (“Open isolated”, Main
	// artboard); the section and component headers keep the icon alone
	const isExampleToolbar = example !== undefined;

	return isolated ? (
		<ToolbarButton
			href={href}
			title="Show all components"
			label={isExampleToolbar ? 'Show all components' : undefined}
			testId={testID}
		>
			<MdCloseFullscreen />
		</ToolbarButton>
	) : (
		<ToolbarButton
			href={getUrl({ name, example, isolated: true })}
			title="Open isolated"
			label={isExampleToolbar ? 'Open isolated' : undefined}
			testId={testID}
		>
			<MdOpenInFull />
		</ToolbarButton>
	);
};

IsolateButton.propTypes = {
	name: PropTypes.string.isRequired,
	example: PropTypes.number,
	isolated: PropTypes.bool,
};

export default IsolateButton;
