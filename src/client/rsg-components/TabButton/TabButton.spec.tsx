import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import TabButton from './index.js';

test('should call onClick handler when the button is clicked', () => {
	const onClick = vi.fn();
	const { getByText } = render(
		<TabButton name="pizza" onClick={onClick}>
			Pizza
		</TabButton>
	);
	fireEvent.click(getByText(/pizza/i));
	expect(onClick).toHaveBeenCalledTimes(1);
});
