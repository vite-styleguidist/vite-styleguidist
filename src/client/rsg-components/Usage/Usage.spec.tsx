import React from 'react';
import { render } from '@testing-library/react';
import Usage from './Usage.js';
import type { PropDescriptor } from '../Props/util.js';
import type * as Rsg from '../../../typings/index.js';

const props: PropDescriptor[] = [
	{
		name: 'children',
		type: { name: 'string' },
		required: true,
		description: 'Button label.',
	},
];
const methods: Rsg.MethodDescriptor[] = [
	{
		name: 'set',
		params: [
			{
				name: 'newValue',
				optional: false,
				description: 'New value for the counter.',
				// Doctrine (JSDoc) type object, as produced by the loader for @param tags
				type: { type: 'NameExpression', name: 'Number' },
			},
		],
		returns: null,
		description: 'Sets the counter to a particular value.',
		docblock: null,
		modifiers: [],
	},
];

describe('Usage', () => {
	it('should render props table', () => {
		const { getAllByRole, getByRole } = render(<Usage props={{ props }} />);

		expect(getAllByRole('columnheader').map((node) => node.textContent)).toEqual([
			'Prop name',
			'Type',
			'Default',
			'Description',
		]);
		expect(getByRole('row', { name: /children/ })).toHaveTextContent('Button label.');
	});

	it('should render methods table', () => {
		const { getAllByRole, getByRole } = render(<Usage props={{ methods }} />);

		expect(getAllByRole('columnheader').map((node) => node.textContent)).toEqual([
			'Method name',
			'Parameters',
			'Description',
		]);
		expect(getByRole('row', { name: /set/ })).toHaveTextContent(
			'Sets the counter to a particular value.'
		);
	});

	it('should render both tables when props and methods are present', () => {
		const { getAllByRole } = render(<Usage props={{ props, methods }} />);

		expect(getAllByRole('table')).toHaveLength(2);
	});

	it('should render nothing without props and methods', () => {
		const { container } = render(<Usage props={{}} />);

		expect(container).toBeEmptyDOMElement();
	});
});
