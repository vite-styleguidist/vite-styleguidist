import React from 'react';
import { render } from '@testing-library/react';
import { LinkRenderer } from './LinkRenderer.js';

const href = '/foo';
const children = 'Foo';

it('renderer should render link', () => {
	const { getByRole } = render(
		<LinkRenderer href={href} classes={{}}>
			{children}
		</LinkRenderer>
	);

	const a = getByRole('link');
	expect(a).toHaveAttribute('href', href);
	expect(a).toHaveTextContent(children);
});

it('should compose passed class names', () => {
	const { getByRole } = render(
		<LinkRenderer classes={{ link: 'baseLinkClass' }} href={href} className="customClass">
			{children}
		</LinkRenderer>
	);

	const a = getByRole('link');
	expect(a.className).toBe('baseLinkClass customClass');
});

it('should properly pass the target attribute', () => {
	const { getByRole } = render(
		<LinkRenderer href={href} target="_blank" classes={{}}>
			{children}
		</LinkRenderer>
	);

	const a = getByRole('link');
	expect(a.getAttribute('target')).toBe('_blank');
});
