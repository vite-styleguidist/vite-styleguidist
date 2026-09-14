import React from 'react';
import PropTypes from 'prop-types';
import Arguments from 'rsg-components/Arguments';
import Argument from 'rsg-components/Argument';
import JsDoc from 'rsg-components/JsDoc';
import Markdown from 'rsg-components/Markdown';
import Para from 'rsg-components/Para';
import Table from 'rsg-components/Table';
import PropName from './PropNameRenderer.js';
import renderTypeColumn from './renderType.js';
import renderExtra from './renderExtra.js';
import renderDefault from './renderDefault.js';
import { PropDescriptor } from './util.js';

function renderDescription(prop: PropDescriptor) {
	const { description, tags = {} } = prop;
	const extra = renderExtra(prop);
	const args = [...(tags.arg || []), ...(tags.argument || []), ...(tags.param || [])];
	const returnDocumentation = (tags.return && tags.return[0]) || (tags.returns && tags.returns[0]);

	return (
		<div>
			{description && <Markdown text={description} />}
			{extra && <Para>{extra}</Para>}
			<JsDoc {...tags} />
			{args.length > 0 && <Arguments args={args} heading />}
			{returnDocumentation && <Argument {...{ ...returnDocumentation, name: '' }} returns />}
		</div>
	);
}

function renderName(prop: PropDescriptor) {
	const { name, required, defaultValue, tags = {} } = prop;
	// Same rule as renderDefault: react-docgen may flag a prop with a default value as
	// required (facebook/react-docgen#221), and such a prop is not required in practice
	return (
		<PropName deprecated={!!tags.deprecated} required={!!required && !defaultValue}>
			{name}
		</PropName>
	);
}

export function getRowKey(row: { name: string }) {
	return row.name;
}

export const columns = [
	{
		caption: 'Prop name',
		render: renderName,
	},
	{
		caption: 'Type',
		render: renderTypeColumn,
	},
	{
		caption: 'Default',
		render: renderDefault,
	},
	{
		caption: 'Description',
		render: renderDescription,
	},
];

interface PropsProps {
	props: PropDescriptor[];
}

const PropsRenderer: React.FunctionComponent<PropsProps> = ({ props }) => {
	return <Table columns={columns} rows={props} getRowKey={getRowKey} />;
};

PropsRenderer.propTypes = {
	props: PropTypes.array.isRequired,
};

export default PropsRenderer;
