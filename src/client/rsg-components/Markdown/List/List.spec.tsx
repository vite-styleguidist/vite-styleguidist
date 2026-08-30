import React from 'react';
import { render } from '@testing-library/react';
import List from './index.js';

describe('Markdown List', () => {
	it('should render an unordered list', () => {
		const { getByRole, getAllByRole } = render(
			<List>
				<li>First</li>
				<li>Second</li>
			</List>
		);

		const list = getByRole('list');
		expect(list.tagName).toBe('UL');
		expect(list.className).toMatch(/^rsg--list-\d+$/);

		const items = getAllByRole('listitem');
		expect(items.map((item) => item.textContent)).toEqual(['First', 'Second']);
		// List styles its items itself, since Markdown renders plain <li> elements
		items.forEach((item) => expect(item.className).toMatch(/^rsg--li-\d+$/));
	});

	it('should render an ordered list', () => {
		const { getByRole, getAllByRole } = render(
			<List ordered>
				<li>First</li>
				<li>Second</li>
			</List>
		);

		const list = getByRole('list');
		expect(list.tagName).toBe('OL');
		expect(list.className).toMatch(/^rsg--list-\d+ rsg--ordered-\d+$/);

		const items = getAllByRole('listitem');
		expect(items.map((item) => item.textContent)).toEqual(['First', 'Second']);
		items.forEach((item) => expect(item.className).toMatch(/^rsg--li-\d+$/));
	});
});
