import React from 'react';
import { act, render } from '@testing-library/react';
import { ReactComponentRenderer } from './ReactComponentRenderer.js';
import { DOCS_LOADING_GRACE } from '../DocsLoading/DocsLoading.js';
import { DOCS_LOADING_LABEL, DOCS_LOADING_RELOAD } from '../DocsLoading/strings.js';

const renderComponent = (props: Record<string, unknown> = {}) =>
	render(
		<ReactComponentRenderer
			classes={{}}
			name="Foo"
			heading={<h2>Foo</h2>}
			pathLine="src/Foo.js"
			description={<p>Bar</p>}
			tabButtons={<button type="button">Props &amp; methods</button>}
			tabBody={<div>the props table</div>}
			examples={<div data-testid="Foo-examples">the examples</div>}
			{...props}
		/>
	);

/** Past the moment at which a pending load is worth mentioning (DocsLoading). */
const waitOutTheGracePeriod = () =>
	act(() => {
		vi.advanceTimersByTime(DOCS_LOADING_GRACE);
	});

// Everything below the heading is drawn as usual unless the new props say otherwise, which
// is what keeps a `ReactComponentRenderer` written before on-demand documentation working
it('should render the body of a documented component', () => {
	const { getByTestId, getByText } = renderComponent();

	expect(getByText('Bar')).toBeInTheDocument();
	expect(getByText('Props & methods')).toBeInTheDocument();
	expect(getByTestId('Foo-examples')).toBeInTheDocument();
	expect(getByTestId('Foo-container')).not.toHaveAttribute('aria-busy');
});

describe('while the documentation is on its way', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should replace the body with the loading state and mark the container busy', () => {
		const { getByTestId, queryByText, queryByTestId } = renderComponent({ docsLoading: true });

		expect(getByTestId('Foo-container')).toHaveAttribute('aria-busy', 'true');
		expect(queryByText('Bar')).not.toBeInTheDocument();
		expect(queryByText('Props & methods')).not.toBeInTheDocument();
		expect(queryByTestId('Foo-examples')).not.toBeInTheDocument();

		waitOutTheGracePeriod();
		expect(getByTestId('docs-loading')).toHaveTextContent(DOCS_LOADING_LABEL);
	});

	// `hasExamples` comes from the section tree, so it is an answer the page has before it
	// has anything else about the component
	it('should show the “add examples” hint at once for a component that has none', () => {
		const { getByTestId } = renderComponent({ docsLoading: true, hasExamples: false });

		expect(getByTestId('Foo-examples')).toBeInTheDocument();
	});

	it('should say nothing about examples while it may still turn out to have some', () => {
		const { queryByTestId } = renderComponent({ docsLoading: true, hasExamples: true });

		expect(queryByTestId('Foo-examples')).not.toBeInTheDocument();
	});
});

describe('when the documentation could not be fetched', () => {
	it('should show the failure and a way out of it, and stop being busy', () => {
		const { getByTestId, getByRole, queryByTestId } = renderComponent({
			docsError: 'Failed to fetch dynamically imported module',
		});

		expect(getByTestId('Foo-container')).not.toHaveAttribute('aria-busy');
		expect(getByTestId('docs-loading-error')).toHaveTextContent(
			'The documentation of Foo could not be loaded.'
		);
		expect(getByRole('button', { name: DOCS_LOADING_RELOAD })).toBeInTheDocument();
		expect(queryByTestId('Foo-examples')).not.toBeInTheDocument();
	});

	it('should still say when a component has no examples', () => {
		const { getByTestId } = renderComponent({ docsError: 'Nope', hasExamples: false });

		expect(getByTestId('Foo-examples')).toBeInTheDocument();
	});
});
