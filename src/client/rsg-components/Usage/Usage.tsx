import React from 'react';
import type { MethodDescriptor } from '../../../typings/index.js';
import { PropDescriptor } from 'rsg-components/Props/util';
import Props from 'rsg-components/Props';
import Methods from 'rsg-components/Methods';
import isEmpty from 'lodash/isEmpty.js';

const Usage: React.FunctionComponent<{
	props: { methods?: MethodDescriptor[]; props?: PropDescriptor[] };
}> = ({ props: { props, methods } }) => {
	const propsNode = props && !isEmpty(props) && <Props props={props} />;
	const methodsNode = methods && !isEmpty(methods) && <Methods methods={methods} />;

	if (!propsNode && !methodsNode) {
		return null;
	}

	return (
		<div>
			{propsNode}
			{methodsNode}
		</div>
	);
};

export default Usage;
