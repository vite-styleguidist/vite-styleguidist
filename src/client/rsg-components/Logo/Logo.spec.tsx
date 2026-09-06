import React from 'react';
import { render } from '@testing-library/react';
import LogoRenderer from './LogoRenderer.js';

it('renderer should render header', () => {
	const { getByRole } = render(<LogoRenderer>Vite Styleguidist</LogoRenderer>);

	const heading = getByRole('heading', { level: 1 });
	expect(heading).toHaveTextContent('Vite Styleguidist');
	expect(heading.className).toMatch(/^rsg--logo-\d+$/);
});
