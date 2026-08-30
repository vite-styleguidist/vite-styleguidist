import React from 'react';
import { render } from '@testing-library/react';
import { CodeRenderer } from './CodeRenderer.js';

describe('Code blocks', () => {
	it('should render code', () => {
		const code = '<button>OK</button>';
		const { getByText } = render(<CodeRenderer classes={{ code: 'code' }}>{code}</CodeRenderer>);

		// The markup must be rendered as text, not injected as HTML
		const element = getByText(code);
		expect(element.tagName).toBe('CODE');
		expect(element).toHaveClass('code');
	});
});
