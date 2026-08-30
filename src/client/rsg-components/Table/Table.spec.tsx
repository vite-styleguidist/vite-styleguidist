import React from 'react';
import { render } from '@testing-library/react';
import { TableRenderer, styles } from './TableRenderer.js';

const columns = [
	{
		caption: 'Name',

		render: ({ name }: { name: string }) => <span>name: {name}</span>,
	},
	{
		caption: 'Type',

		render: ({ type }: { type: string }) => <span>type: {type}</span>,
	},
];
const rows = [
	{ name: 'Quattro formaggi', type: 'pizza' },
	{ name: 'Tiramisu', type: 'desert' },
	{ name: 'Unicorn', type: 'animal' },
];
const props = {
	classes: classes(styles),
	getRowKey: (row: { name: string }) => row.name,
};

it('should render a table', () => {
	const { container, getByRole, getAllByRole } = render(
		<TableRenderer {...props} columns={columns} rows={rows} />
	);

	expect(getByRole('table')).toHaveClass('table', { exact: true });
	expect(container.querySelector('thead')).toHaveClass('tableHead', { exact: true });

	const headers = getAllByRole('columnheader');
	expect(headers.map((node) => node.textContent)).toEqual(['Name', 'Type']);
	headers.forEach((node) => expect(node).toHaveClass('cellHeading', { exact: true }));

	// Header row + one row per item
	expect(getAllByRole('row')).toHaveLength(rows.length + 1);

	const cells = getAllByRole('cell');
	expect(cells.map((node) => node.textContent)).toEqual([
		'name: Quattro formaggi',
		'type: pizza',
		'name: Tiramisu',
		'type: desert',
		'name: Unicorn',
		'type: animal',
	]);
	cells.forEach((node) => expect(node).toHaveClass('cell', { exact: true }));
});
