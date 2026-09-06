import React, { Component } from 'react';
import PlaygroundError from 'rsg-components/PlaygroundError';

interface MdxPageErrorProps {
	/** Name of the component or section the page documents, shown in the message. */
	name?: string;
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
		const { name, children } = this.props;
		if (!error) {
			return children;
		}
		const message = `${name ? `${name}: ` : ''}${error.message || String(error)}`;
		// `editable: false` — there is no editor for the page itself, so the panel’s hint points
		// at the source file, which is where an MDX authoring error has to be fixed.
		return <PlaygroundError message={message} editable={false} />;
	}
}
