import React from 'react';
import { render } from '@testing-library/react';
import VersionRenderer from './VersionRenderer.js';

it('renderer should render version', () => {
	const { getByLabelText } = render(<VersionRenderer>1.2.3-a</VersionRenderer>);

	const version = getByLabelText('version');
	expect(version.tagName).toBe('P');
	expect(version).toHaveTextContent('1.2.3-a');
	// Styled() wraps the renderer, so the class name is a generated JSS one
	expect(version).toHaveAttribute('class', expect.stringMatching(/^rsg--version-\d+$/));
});
