import React from 'react';
import { render } from '@testing-library/react';
import IsolateButton from './IsolateButton.js';

it('should render a link to isolated mode', () => {
	const { getByTestId } = render(<IsolateButton name="Pizza" href="/#pizza" />);

	const link = getByTestId('Pizza-isolate-button');
	expect(link.tagName).toBe('A');
	expect(link).toHaveAttribute('href', '/#!/Pizza');
	expect(link).toHaveAccessibleName('Open isolated');
	expect(link.querySelector('svg')).toBeInTheDocument();
});

it('should render a link to example isolated mode', () => {
	const { getByTestId } = render(<IsolateButton name="Pizza" href="/#pizza" example={3} />);

	const link = getByTestId('Pizza-3-isolate-button');
	expect(link).toHaveAttribute('href', '/#!/Pizza/3');
	expect(link).toHaveAccessibleName('Open isolated');
});

it('should render a link home in isolated mode', () => {
	const { getByTestId } = render(<IsolateButton name="Pizza" href="/#pizza" isolated />);

	const link = getByTestId('Pizza-isolate-button');
	expect(link).toHaveAttribute('href', '/#pizza');
	expect(link).toHaveAccessibleName('Show all components');
});

it('should render nothing in isolated mode without a link home', () => {
	const { container } = render(<IsolateButton name="Pizza" href="" isolated />);

	expect(container).toBeEmptyDOMElement();
});
