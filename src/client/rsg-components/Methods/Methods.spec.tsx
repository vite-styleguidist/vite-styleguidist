import React from 'react';
import { render } from '@testing-library/react';
import MethodsRenderer, { columns } from './MethodsRenderer.js';
import type { MethodDescriptor } from '../../../typings/index.js';

// Renders every column of every method into plain markup so the assertions
// don't depend on the Table renderer.
function ColumnsRenderer({ methods }: { methods: MethodDescriptor[] }) {
	return (
		<ul>
			{methods.map((row, rowIdx) => (
				<li key={rowIdx}>
					{columns.map((col, colIdx) => (
						<div key={colIdx}>{col.render(row)}</div>
					))}
				</li>
			))}
		</ul>
	);
}

// The client never sees raw react-docgen output: src/loaders/utils/getProps.ts merges it
// with the doctrine-parsed JSDoc tags, so parameter and return types are doctrine type
// expressions (`{ type: 'NameExpression', name: 'Number' }`), which is what Argument renders.
const method = (overrides: Partial<MethodDescriptor>): MethodDescriptor => ({
	name: 'method',
	docblock: null,
	modifiers: [],
	params: [],
	returns: null,
	...overrides,
});

describe('MethodsRenderer', () => {
	it('should render a table', () => {
		const { getByRole, getAllByRole, getByText } = render(
			<MethodsRenderer methods={[method({ description: 'Public' })]} />
		);

		expect(getByRole('table')).toBeInTheDocument();
		expect(getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
			'Method name',
			'Parameters',
			'Description',
		]);
		expect(getByText('method()').tagName).toBe('CODE');
		expect(getByText('Public')).toBeInTheDocument();
	});
});

describe('columns', () => {
	it('should render public method', () => {
		const { getByText } = render(<ColumnsRenderer methods={[method({ description: 'Public' })]} />);

		expect(getByText('method()').className).not.toMatch(/isDeprecated/);
		expect(getByText('Public')).toBeInTheDocument();
	});

	it('should render parameters', () => {
		const { container } = render(
			<ColumnsRenderer
				methods={[
					method({
						description: 'Public',
						params: [
							{
								name: 'value',
								description: 'Description',
								optional: false,
								type: { type: 'NameExpression', name: 'Number' },
							},
						],
					}),
				]}
			/>
		);

		expect(container).toHaveTextContent('value: Number — Description');
	});

	it('should render returns', () => {
		const { container } = render(
			<ColumnsRenderer
				methods={[
					method({
						returns: {
							description: 'Description',
							type: { type: 'NameExpression', name: 'Number' },
						},
					}),
				]}
			/>
		);

		expect(container).toHaveTextContent('Returns Number — Description');
	});

	it('should render JsDoc tags', () => {
		const { container } = render(
			<ColumnsRenderer
				methods={[
					method({
						name: 'Foo',
						tags: {
							since: [
								{
									title: 'since',
									description: '1.0.0',
								},
							],
						},
					}),
				]}
			/>
		);

		expect(container).toHaveTextContent('Since: 1.0.0');
	});

	it('should render deprecated JsDoc tags', () => {
		const { container, getByText } = render(
			<ColumnsRenderer
				methods={[
					method({
						name: 'Foo',
						tags: {
							deprecated: [
								{
									title: 'description',
									description: 'Use *another* method',
								},
							],
						},
					}),
				]}
			/>
		);

		// Deprecated methods get a struck-through name and a “Deprecated:” note
		expect(getByText('Foo()').className).toMatch(/rsg--isDeprecated-\d+/);
		expect(container).toHaveTextContent('Deprecated: Use another method');
		expect(getByText('another').tagName).toBe('EM');
	});
});
