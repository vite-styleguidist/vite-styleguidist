import React from 'react';
import { render } from '@testing-library/react';
import { MessageRenderer } from './MessageRenderer.js';

it('renderer should render message', () => {
	const message = 'Hello *world*!';
	const { container, getByText } = render(
		<MessageRenderer classes={{}}>{message}</MessageRenderer>
	);

	// The message is rendered as Markdown
	expect(container).toHaveTextContent('Hello world!');
	expect(getByText('world').tagName).toBe('EM');
});

it('renderer should render message for array', () => {
	const messages = ['Hello *world*!', 'Foo _bar_'];
	const { container, getByText } = render(
		<MessageRenderer classes={{}}>{messages}</MessageRenderer>
	);

	// Array items are joined into one Markdown document
	expect(container).toHaveTextContent('Hello world! Foo bar');
	expect(getByText('world').tagName).toBe('EM');
	expect(getByText('bar').tagName).toBe('EM');
});
