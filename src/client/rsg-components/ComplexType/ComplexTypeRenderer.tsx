import React from 'react';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import { MdInfoOutline } from 'react-icons/md';
import Type from 'rsg-components/Type';
import Tooltip from 'rsg-components/Tooltip';
import type * as Rsg from '../../../typings/index.js';

/*
 * A type whose full signature (a shape, union, tuple, function) only fits in a tooltip.
 * The name is set like any other type, with the dotted underline and `help` cursor that
 * conventionally mean "there is more on hover"; the small info icon stays as a second,
 * quieter cue for keyboard users who see the trigger take focus.
 */
export const styles = ({ space, color, fontFamily }: Rsg.Theme) => ({
	complexType: {
		alignItems: 'center',
		display: 'inline-flex',
		cursor: 'help',
	},
	name: {
		flexShrink: 0,
		textDecoration: 'underline dotted',
		textDecorationColor: color.type,
		textUnderlineOffset: '0.2em',
	},
	icon: {
		marginLeft: space[0],
		flexShrink: 0,
		color: color.light,
	},
	// The raw signature inside the tooltip: code, wrapped rather than clipped
	raw: {
		fontFamily: fontFamily.monospace,
		fontSize: 'inherit',
		color: 'inherit',
		whiteSpace: 'pre-wrap',
		wordBreak: 'break-word',
	},
});

export interface ComplexTypeProps extends JssInjectedProps {
	name: string;
	raw: string;
}

function ComplexTypeRenderer({ classes, name, raw }: ComplexTypeProps) {
	return (
		<Tooltip placement="right" content={<span className={classes.raw}>{raw}</span>}>
			<span className={classes.complexType}>
				<span className={classes.name}>
					<Type>{name}</Type>
				</span>
				<MdInfoOutline className={classes.icon} />
			</span>
		</Tooltip>
	);
}

export default Styled<ComplexTypeProps>(styles)(ComplexTypeRenderer);
