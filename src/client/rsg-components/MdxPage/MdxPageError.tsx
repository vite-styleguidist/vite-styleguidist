import React, { Component } from 'react';
import PlaygroundError from 'rsg-components/PlaygroundError';

interface MdxPageErrorProps {
	/** Name of the component or section the page documents, shown in the message. */
	name?: string;
	/**
	 * Path of the `.mdx` file, named in the hint so the visitor knows which file to open. It is
	 * optional because the compiled page does not carry its own path yet; without it the hint
	 * still says the failure is in the page’s `.mdx` file rather than in an example.
	 */
	file?: string;
	children?: React.ReactNode;
}

interface MdxPageErrorState {
	error: Error | null;
}

/**
 * Error boundary around one MDX page.
 *
 * MDX fails at *render* time, not at compile time, for the two most common authoring mistakes:
 * a component used but never imported or passed (`_missingMdxReference` throws
 * “Expected component `X` to be defined”) and an inline `{expression}` that throws. Without a
 * boundary here the nearest one is `StyleGuide.tsx`, which replaces the entire style guide with
 * the crash screen — one typo in one page and nothing is browsable. This keeps the failure
 * where the page is, so the rest of the guide, including the sidebar, still works.
 *
 * It has no reset button on purpose: the page is remounted whenever the code revision changes
 * (`Examples.tsx` keys it on `codeRevision`), so fixing the `.mdx` file clears the panel by itself.
 */
export default class MdxPageError extends Component<MdxPageErrorProps, MdxPageErrorState> {
	public state: MdxPageErrorState = { error: null };

	public static getDerivedStateFromError(error: Error): MdxPageErrorState {
		return { error };
	}

	public render() {
		const { error } = this.state;
		const { name, file, children } = this.props;
		if (!error) {
			return children;
		}
		const message = `${name ? `${name}: ` : ''}${error.message || String(error)}`;
		// The failing unit here is the whole page, not one example, and there is no editor to
		// point at: MDX fails while rendering the prose, so the panel gets its own title and a
		// hint naming the `.mdx` file instead of PlaygroundError’s “fix it in its Markdown file”.
		return (
			<PlaygroundError
				message={message}
				editable={false}
				title="This page failed to render"
				hint={file ? `Fix the page in ${file}.` : 'Fix the page in its .mdx file.'}
			/>
		);
	}
}
