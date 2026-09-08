import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import Tooltip, { TooltipPlacement } from './TooltipRenderer.js';

function renderComponent(content = 'tooltip', placement?: TooltipPlacement) {
	return render(
		<Tooltip content={content} placement={placement}>
			<div data-testid="child" />
		</Tooltip>
	);
}

describe('Tooltip', () => {
	test('should render child component as is', () => {
		const { container, getByTestId } = renderComponent();
		expect(container).toContainElement(getByTestId('child'));
	});

	test('should not read element.ref, which React 19 warns about', () => {
		// @tippyjs/react clones a child trigger and reads `children.ref` to chain refs;
		// TooltipRenderer hands it the trigger through `reference` instead so that
		// React 19's removed `element.ref` getter is never touched. Guards the regression.
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		renderComponent();
		expect(consoleError).not.toHaveBeenCalled();
		consoleError.mockRestore();
	});

	test('should render content in the tooltop body', () => {
		const { container, getByRole } = renderComponent();
		fireEvent.focus(getByRole('button'));
		expect(container.querySelector('[data-tippy-root]')).toHaveTextContent('tooltip');
	});

	test('should show the tooltip by focus in', async () => {
		const { container, getByRole } = renderComponent();
		fireEvent.focus(getByRole('button'));
		await waitFor(() =>
			expect(container.querySelector('[data-state="visible"]')).toBeInTheDocument()
		);
	});

	test('should show the tooltip by click', async () => {
		const { container, getByRole } = renderComponent();
		fireEvent.click(getByRole('button'));
		await waitFor(() =>
			expect(container.querySelector('[data-state="visible"]')).toBeInTheDocument()
		);
	});

	test('should show the tooltip by mouse enter', async () => {
		const { container, getByRole } = renderComponent();
		fireEvent.mouseEnter(getByRole('button'));
		await waitFor(() =>
			expect(container.querySelector('[data-state="visible"]')).toBeInTheDocument()
		);
	});

	describe.each([['top'], ['right'], ['left'], ['bottom']])(
		'Test placement attribute',
		(placement) => {
			test(`should have ${placement} in data-placement attribute`, async () => {
				// @ts-ignore
				const { container, getByRole } = renderComponent(undefined, placement);
				fireEvent.focus(getByRole('button'));
				await waitFor(() =>
					expect(container.querySelector('[data-state="visible"]')).toBeInTheDocument()
				);
				expect(container.querySelector('[data-placement]')).toHaveAttribute(
					'data-placement',
					placement
				);
			});
		}
	);
});
