import React, { cloneElement, Children } from 'react';
import cx from 'clsx';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import type * as Rsg from '../../../../typings/index.js';

const styles = ({ space, color, fontFamily, fontSize, lineHeight }: Rsg.Theme) => ({
	list: {
		marginTop: 0,
		marginBottom: space[2],
		paddingLeft: space[3],
		fontSize: 'inherit',
	},
	ordered: {
		listStyleType: 'decimal',
	},
	li: {
		marginBottom: space[1],
		color: color.base,
		fontFamily: fontFamily.base,
		// The prose size, like Para, so lists and paragraphs of one document line up
		fontSize: fontSize.text,
		lineHeight: lineHeight.base,
		listStyleType: 'inherit',
		'&:last-child': {
			isolate: false,
			marginBottom: 0,
		},
		// A nested list continues the item: no extra gap above it, the item gap below
		'& $list': {
			isolate: false,
			marginTop: space[1],
			marginBottom: 0,
		},
	},
});

interface ListProps extends JssInjectedProps {
	ordered?: boolean;
	children: React.ReactNode;
}

export const ListRenderer: React.FunctionComponent<ListProps> = ({
	classes,
	ordered = false,
	children,
}) => {
	const Tag = ordered ? 'ol' : 'ul';

	const classNames = cx(classes.list, ordered && classes.ordered);

	return (
		<Tag className={classNames}>
			{Children.map(children, (li) =>
				React.isValidElement<{ className?: string }>(li)
					? cloneElement(li, { className: classes.li })
					: li
			)}
		</Tag>
	);
};

export default Styled<ListProps>(styles)(ListRenderer);
