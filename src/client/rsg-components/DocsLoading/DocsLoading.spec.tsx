import React from 'react';
import { act, render, screen } from '@testing-library/react';
import DocsLoading, { DOCS_LOADING_GRACE } from './DocsLoading.js';
import DocsLoadingStyled, {
	DocsLoadingRenderer,
	styles,
} from './DocsLoadingRenderer.js';
import { DOCS_LOADING_LABEL, DOCS_LOADING_RELOAD } from './strings.js';
import Context from '../Context/index.js';

/** The style sheets JSS has attached to the document, as text. */
const attachedCss = () =>
	Array.from(document.querySelectorAll('style'))
		.map((element) =>
			element.sheet
				? Array.from(element.sheet.cssRules)
						.map((rule) => rule.cssText)
						.join('\n')
				: ''
		)
		.join('\n');

const Provider = (props: any) => (
	<Context.Provider value={{ config: {} } as any} {...props} />
);

describe('the grace period', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should show nothing at all while a load may still turn out to be fast', () => {
		render(<DocsLoading name="Foo" />);

		expect(screen.queryByRole('status')).not.toBeInTheDocument();

		act(() => {
			vi.advanceTimersByTime(DOCS_LOADING_GRACE - 1);
		});
		expect(screen.queryByRole('status')).not.toBeInTheDocument();
	});

	it('should show the spinner once the load has been slow enough to be worth saying so', () => {
		render(<DocsLoading name="Foo" />);

		act(() => {
			vi.advanceTimersByTime(DOCS_LOADING_GRACE);
		});

		expect(screen.getByRole('status')).toBeInTheDocument();
		expect(screen.getByText(DOCS_LOADING_LABEL)).toBeInTheDocument();
	});

	it('should drop the timer when the documentation arrives before it fires', () => {
		const clear = vi.spyOn(globalThis, 'clearTimeout');
		const { unmount } = render(<DocsLoading name="Foo" />);

		unmount();
		act(() => {
			vi.advanceTimersByTime(DOCS_LOADING_GRACE * 2);
		});

		expect(clear).toHaveBeenCalled();
		expect(screen.queryByRole('status')).not.toBeInTheDocument();
		clear.mockRestore();
	});

	// A failure is not going to resolve itself, and the load it comes from was by
	// definition not one of the fast ones the grace period is there for
	it('should show an error without waiting', () => {
		render(<DocsLoading status="error" name="Foo" />);

		expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument();
	});
});

describe('the loading state', () => {
	it('should announce itself politely, without taking the focus', () => {
		render(<DocsLoadingRenderer classes={classes(styles)} status="loading" name="Foo" />);

		const status = screen.getByRole('status');
		expect(status).toHaveAttribute('aria-live', 'polite');
		expect(status).toHaveTextContent(DOCS_LOADING_LABEL);
	});

	it('should draw a ring beside the label', () => {
		render(<DocsLoadingRenderer classes={classes(styles)} status="loading" name="Foo" />);

		expect(screen.getByTestId('docs-loading-spinner')).toBeInTheDocument();
		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});

	// The ring is the same ring for a reader who asked for no motion; it simply stops
	// turning, which is the whole of `prefers-reduced-motion` here
	it('should stop the ring under prefers-reduced-motion', () => {
		render(
			<Provider>
				<DocsLoadingStyled status="loading" name="Foo" />
			</Provider>
		);

		const css = attachedCss();
		const spinner = document.querySelector('[data-testid="docs-loading-spinner"]');
		const spinnerClass = (spinner as HTMLElement).className;
		expect(css).toMatch(
			new RegExp(
				`@media \\(prefers-reduced-motion: reduce\\) \\{\\s*\\.${spinnerClass} \\{ animation: none; \\}`
			)
		);
	});
});

describe('the error state', () => {
	it('should name the component that could not be documented', () => {
		render(<DocsLoadingRenderer classes={classes(styles)} status="error" name="Foo" />);

		expect(
			screen.getByText('The documentation of Foo could not be loaded.')
		).toBeInTheDocument();
		expect(screen.queryByTestId('docs-loading-spinner')).not.toBeInTheDocument();
	});

	it('should keep the browser’s own words for the failure out of the page but at hand', () => {
		render(
			<DocsLoadingRenderer
				classes={classes(styles)}
				status="error"
				name="Foo"
				error="Failed to fetch dynamically imported module"
			/>
		);

		expect(screen.getByText(/could not be loaded/i)).toHaveAttribute(
			'title',
			'Failed to fetch dynamically imported module'
		);
	});

	// A built style guide cannot re-fetch a module URL whose fetch failed, so reloading the
	// page is the only recovery there is (ADR 0019)
	it('should offer to reload the page, and reload it', async () => {
		const reload = vi.fn();
		const original = window.location;
		Object.defineProperty(window, 'location', {
			configurable: true,
			value: { ...original, reload },
		});

		render(<DocsLoadingRenderer classes={classes(styles)} status="error" name="Foo" />);
		screen.getByRole('button', { name: DOCS_LOADING_RELOAD }).click();

		expect(reload).toHaveBeenCalledTimes(1);
		Object.defineProperty(window, 'location', { configurable: true, value: original });
	});
});
