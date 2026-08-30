import React from 'react';
import { render } from '@testing-library/react';
import Pre from './index.js';

describe('Markdown Pre', () => {
	it('should render a pre', () => {
		const { getByText } = render(<Pre>This is pre-formatted text.</Pre>);

		const pre = getByText('This is pre-formatted text.');
		expect(pre.tagName).toBe('PRE');
		expect(pre.className).toMatch(/^rsg--pre-\d+$/);
	});

	it('should render highlighted code', () => {
		const code = '<button>OK</button>';
		const { container } = render(<Pre className="lang-html">{code}</Pre>);

		// A `lang-*` class marks children as pre-highlighted HTML, injected as is
		const pre = container.firstChild as HTMLElement;
		expect(pre.className).toMatch(/^lang-html rsg--pre-\d+$/);
		expect(pre.innerHTML).toBe(code);
		expect(pre.querySelector('button')).toHaveTextContent('OK');
	});
});
