import React from 'react';
import { getDefaultProps } from 'react-styleguidist/lib/loaders/utils/getProps';

const icons = require.context('../icons', true, /\.svg$/);

export default function Button(props) {
	return (
		<button type="button" title={process.env.API_URL} data-icons={icons.keys().length}>
			{getDefaultProps(props).children}
		</button>
	);
}
