import React, { Component } from 'react';
import PropTypes from 'prop-types';
import PlaygroundError from 'rsg-components/PlaygroundError';
import ReactExample from 'rsg-components/ReactExample';
import Context, { StyleGuideContextContents } from 'rsg-components/Context';
// `rsg-react-root` is aliased by the Vite config to the createRoot() (React 18+) or the
// ReactDOM.render() (React 16.14 and 17) implementation, see utils/reactRoot.ts
import { mountRoot } from 'rsg-react-root';
import type { StyleguideRoot } from '../../utils/reactRoot.js';

const improveErrorMessage = (message: string) =>
	message.replace(
		'Check the render method of `StateHolder`.',
		'Check the code of your example in a Markdown file or in the editor below.'
	);

interface PreviewProps {
	code: string;
	evalInContext(code: string): () => any;
	/**
	 * Whether the example is rendered with the code editor, passed on to PlaygroundError so its
	 * hint points at the editor or at the Markdown file (Playground knows which)
	 */
	editable?: boolean;
}

interface PreviewState {
	error: string | null;
}

export default class Preview extends Component<PreviewProps, PreviewState> {
	public static propTypes = {
		code: PropTypes.string.isRequired,
		evalInContext: PropTypes.func.isRequired,
		editable: PropTypes.bool,
	};
	public static contextType = Context;

	private mountNode: Element | null = null;
	private reactRoot: StyleguideRoot | null = null;
	private timeoutId: ReturnType<typeof setTimeout> | null = null;
	private errorTimeoutId: ReturnType<typeof setTimeout> | null = null;

	public state: PreviewState = {
		error: null,
	};

	public componentDidMount() {
		// Clear console after hot reload, do not clear on the first load
		// to keep any warnings
		if ((this.context as StyleGuideContextContents).codeRevision > 0) {
			// eslint-disable-next-line no-console
			console.clear();
		}

		this.executeCode();
	}

	public shouldComponentUpdate(nextProps: PreviewProps, nextState: PreviewState) {
		return this.state.error !== nextState.error || this.props.code !== nextProps.code;
	}

	public componentDidUpdate(prevProps: PreviewProps) {
		if (this.props.code !== prevProps.code) {
			this.executeCode();
		}
	}

	public componentWillUnmount() {
		this.clearPendingError();
		this.unmountPreview();
	}

	/**
	 * Drops the error handleError() deferred to the next macrotask. Anything that supersedes the
	 * run that reported it (a new render, an unmount) has to call this: the timer holds the
	 * previous code’s message and would otherwise paint it over the new result.
	 */
	private clearPendingError() {
		if (this.errorTimeoutId) {
			clearTimeout(this.errorTimeoutId);
			this.errorTimeoutId = null;
		}
	}

	public unmountPreview() {
		this.clearPendingError();
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}
		// React forbids unmounting a root synchronously while another root renders,
		// so the unmount is deferred to the next macrotask
		this.timeoutId = setTimeout(() => {
			if (this.reactRoot) {
				this.reactRoot.unmount();
				this.reactRoot = null;
			}
		});
	}

	private executeCode() {
		// Both timers belong to the previous code: a pending unmount would blank the preview this
		// run is about to render into, and a pending error would land on top of code that has
		// just cleared it. Cancel them before the state reset, not after, so the new run owns
		// whatever is on screen.
		this.clearPendingError();
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}

		this.setState({
			error: null,
		});

		const { code } = this.props;
		if (!code) {
			return;
		}

		const wrappedComponent: React.FunctionComponentElement<any> = (
			<ReactExample
				code={code}
				evalInContext={this.props.evalInContext}
				onError={this.handleError}
				compilerConfig={(this.context as StyleGuideContextContents).config.compilerConfig}
			/>
		);

		/* istanbul ignore next */
		window.requestAnimationFrame(() => {
			if (!this.mountNode) {
				return;
			}
			try {
				if (this.reactRoot === null) {
					this.reactRoot = mountRoot(this.mountNode);
					this.reactRoot.render(wrappedComponent);
				} else {
					this.reactRoot.render(wrappedComponent);
				}
			} catch (err) {
				if (err instanceof Error) {
					this.handleError(err);
				}
			}
		});
	}

	private handleError = (err: Error) => {
		this.unmountPreview();

		// A compile error is reported synchronously from inside ReactExample's render()
		// (compileCode -> onError). React 16's "cannot update during an existing state
		// transition" guard is renderer-wide, so a setState here, while the example root is
		// rendering, logs that warning in development builds of React 16 even though the
		// update targets a component in another root; 17 and later only complain about the
		// component that is itself rendering. Deferring to the next macrotask (the same way
		// unmountPreview() defers the unmount) keeps every supported React quiet.
		this.clearPendingError();
		this.errorTimeoutId = setTimeout(() => {
			this.errorTimeoutId = null;
			this.setState({
				error: improveErrorMessage(err.toString()),
			});
		});

		console.error(err); // eslint-disable-line no-console
	};

	private callbackRef = (ref: HTMLDivElement | null) => {
		this.mountNode = ref;
		if (!this.reactRoot && ref) {
			this.reactRoot = mountRoot(ref);
		}
	};

	public render() {
		const { error } = this.state;
		return (
			<>
				<div data-testid="mountNode" ref={this.callbackRef} />
				{error && <PlaygroundError message={error} editable={this.props.editable} />}
			</>
		);
	}
}
