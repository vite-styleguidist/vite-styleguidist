import React from 'react';
import { render } from '@testing-library/react';
import { Table, TableHead, TableBody, TableRow, TableCell } from './index.js';

describe('Markdown Table', () => {
	it('should render a table', () => {
		const { container, getAllByRole } = render(
			<Table>
				<TableHead>
					<TableRow>
						<TableCell header>1st header</TableCell>
						<TableCell header>2nd header</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					<TableRow>
						<TableCell>1st cell</TableCell>
						<TableCell>2nd cell</TableCell>
					</TableRow>
				</TableBody>
			</Table>
		);

		expect(getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
			'1st header',
			'2nd header',
		]);
		expect(getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['1st cell', '2nd cell']);
		expect(container.firstChild).toMatchSnapshot();
	});
});
