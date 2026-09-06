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

it('renderer should point at the editor when the example is editable', () => {
	const { getByText } = render(<PlaygroundErrorRenderer classes={{}} message="Boom" />);

	expect(getByText('Fix the code in the editor below; the preview updates as you type.'));
});

it('renderer should point at the Markdown file when there is no editor', () => {
	// `noeditor` examples and exampleMode: 'hide' render the preview without an editor
	const { getByText, queryByText } = render(
		<PlaygroundErrorRenderer classes={{}} message="Boom" editable={false} />
	);

	expect(getByText('Fix the example in its Markdown file.'));
	expect(queryByText(/in the editor below/)).toBeNull();
});

it('renderer should announce the message politely, and nothing else', () => {
	const message = 'SyntaxError: Unexpected token';
	const { getByRole } = render(<PlaygroundErrorRenderer classes={{}} message={message} />);

	// The panel is remounted on every debounced run, so only the message is a live region
	const status = getByRole('status');
	expect(status.tagName).toBe('PRE');
	expect(status).toHaveTextContent(message);
});
