import React from 'react';
import { render } from '@testing-library/react';
import { PlaygroundErrorRenderer } from './PlaygroundErrorRenderer.js';

it('renderer should render message', () => {
	const message = 'Hello *world*!';
	const { getByText } = render(<PlaygroundErrorRenderer classes={{}} message={message} />);

	// The message is rendered verbatim (no Markdown) inside a <pre>
	const error = getByText(message);
	expect(error.tagName).toBe('PRE');
});
