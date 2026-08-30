import React from 'react';
import { render } from '@testing-library/react';
import Wrapper from './Wrapper.js';

it('should render children', () => {
	const { getByText } = render(
		<Wrapper onError={() => {}}>
			<span>Hello</span>
		</Wrapper>
	);

	expect(getByText('Hello').tagName).toBe('SPAN');
});

it('should call onError handler when a child throws during render', () => {
	const onError = vi.fn();
	const error = new Error('err');
	// Must throw on every render: React retries a failed concurrent render synchronously
	// before handing the error to the boundary
	const Bomb = (): null => {
		throw error;
	};
	// React logs the caught error (and a dev-only hint about getDerivedStateFromError)
	const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

	const { container } = render(
		<Wrapper onError={onError}>
			<Bomb />
		</Wrapper>
	);

	expect(onError).toHaveBeenCalledTimes(1);
	expect(onError).toHaveBeenCalledWith(error);
	// Wrapper has no fallback UI, React removes the failed children
	expect(container).toBeEmptyDOMElement();

	consoleError.mockRestore();
});
