import React from 'react';
import PropTypes from 'prop-types';
import type { ReactNode } from 'react';

// Inlined from react-group 4.0.0 by Artem Sapegin (https://github.com/sapegin/react-group),
// MIT licensed, with thanks. The package declares `react >=18` as a peer dependency although
// its code (Children.toArray, isValidElement, cloneElement) has worked since React 16, and
// that range alone made `npm install` warn, or fail on older npm, in React 16 and 17
// projects once this package accepted them (see docs/decisions/0013-react-16-support.md).

export interface GroupProps {
	/** Items */
	children?: ReactNode;
	/** Custom separator (space by default) */
	separator?: ReactNode;
}

/**
 * Render a collection of items separated by a space or another separator, skipping
 * empty items (`null`, `false`, `''`).
 *
 * @visibleName Group
 */
export default function Group({ children, separator = ' ' }: GroupProps) {
	const items = React.Children.toArray(children).filter(Boolean);
	if (items.length <= 1) {
		return <>{items}</>;
	}

	// Every element in an array needs a key: the items got theirs from Children.toArray(),
	// an element separator is cloned with one derived from the item it precedes.
	const separatorIsElement = React.isValidElement(separator);
	const [first, ...rest] = items;
	const result: ReactNode[] = [first];
	rest.forEach((item, index) => {
		const itemKey = React.isValidElement(item) && item.key !== null ? item.key : index;
		result.push(
			separatorIsElement
				? React.cloneElement(separator, { key: `separator-${itemKey}` })
				: separator,
			item
		);
	});

	return <>{result}</>;
}

Group.propTypes = {
	children: PropTypes.node,
	separator: PropTypes.node,
};
