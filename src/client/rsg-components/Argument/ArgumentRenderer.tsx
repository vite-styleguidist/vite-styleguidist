import React from 'react';
import PropTypes from 'prop-types';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import Markdown from 'rsg-components/Markdown';
import Name from 'rsg-components/Name';
import Type from 'rsg-components/Type';
import Group from 'rsg-components/Group';
import doctrine from 'doctrine';
import type * as Rsg from '../../../typings/index.js';

export const styles = ({ space, color, fontFamily, fontSize }: Rsg.Theme) => ({
	block: {
		marginBottom: space[2],
	},
	// The colon between `name` and `type`: monospace like its neighbours, in the secondary
	// colour so the two coloured tokens stay the focus
	punctuation: {
		fontFamily: fontFamily.monospace,
		fontSize: fontSize.small,
		color: color.light,
	},
	// The methods table gives every column but the description its minimum content width,
	// which for Parameters was the width of the column label alone: an argument then wrapped
	// over half a dozen lines in a narrow stripe. Keeping `name: Type` on one line makes it
	// the column's minimum instead, and the description reflows next to it. The table's
	// container scrolls horizontally, so an unusually long type name cannot break the page.
	nameType: {
		whiteSpace: 'nowrap',
		// Name and Type are isolated components, so their own white-space is reset to
		// `normal` and Chromium then takes the break opportunity at the space between them
		// despite the nowrap above: hand them the wrapper's value explicitly
		'& > *': {
			isolate: false,
			whiteSpace: 'inherit',
		},
	},
});

export interface ArgumentProps {
	name?: string;
	type?: any;
	default?: string;
	description?: string | null;
	returns?: boolean;
	block?: boolean;
}

type ArgumentPropsWithClasses = ArgumentProps & JssInjectedProps;

export const ArgumentRenderer: React.FunctionComponent<ArgumentPropsWithClasses> = ({
	classes,
	name,
	type,
	description,
	returns,
	block,
	...props
}) => {
	const isOptional = type && type.type === 'OptionalType';
	const defaultValue = props.default;
	if (isOptional) {
		type = type.expression;
	}
	const typeName = type ? doctrine.type.stringify(type) : '';
	const content = (
		<Group>
			{returns && 'Returns'}
			{(name || type) && (
				<span className={classes.nameType}>
					{name && <Name>{name}</Name>}
					{name && type && <span className={classes.punctuation}>:</span>}
					{name && type && ' '}
					{type && (
						<Type>
							{typeName}
							{isOptional && '?'}
							{!!defaultValue && `=${defaultValue}`}
						</Type>
					)}
				</span>
			)}
			{type && description && `—`}
			{description && <Markdown text={`${description}`} inline />}
		</Group>
	);

	if (block) {
		return <div className={classes.block}>{content}</div>;
	}

	return content;
};

ArgumentRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	name: PropTypes.string,
	type: PropTypes.object,
	default: PropTypes.string,
	description: PropTypes.string,
	returns: PropTypes.bool,
	block: PropTypes.bool,
};

export default Styled<ArgumentPropsWithClasses>(styles)(ArgumentRenderer);
