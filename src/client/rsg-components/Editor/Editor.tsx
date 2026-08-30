import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import * as SimpleEditorModule from 'react-simple-code-editor';
import { highlight as prismHighlight, languages } from 'prismjs';
import 'prismjs/components/prism-clike.js';
import 'prismjs/components/prism-markup.js';
import 'prismjs/components/prism-javascript.js';
import { Styles } from 'jss';
import 'prismjs/components/prism-jsx.js';
import { space } from '../../styles/theme.js';
import prismTheme from '../../styles/prismTheme.js';
import type * as Rsg from '../../../typings/index.js';

// react-simple-code-editor is CommonJS (`exports.default`). Rolldown applies Node-style
// interop to imports from an ES module package, so in production builds the default
// import is the whole `exports` object rather than the component; unwrap both shapes.
type SimpleEditorType = typeof SimpleEditorModule.default;
const SimpleEditor: SimpleEditorType =
	(SimpleEditorModule as unknown as { default: { default?: SimpleEditorType } }).default.default ??
	SimpleEditorModule.default;

const highlight = (code: string) => prismHighlight(code, languages.jsx, 'jsx');

const styles = ({ fontFamily, fontSize, color, borderRadius }: Rsg.Theme): Styles => ({
	root: {
		fontFamily: fontFamily.monospace,
		fontSize: fontSize.small,
		background: color.codeBackground,
		borderRadius,
		'& textarea': {
			isolate: false,
			transition: 'all ease-in-out .1s',
			// important to override inline styles in react-simple-code-editor
			border: `1px ${color.border} solid !important`,
			borderRadius,
		},
		'& textarea:focus': {
			isolate: false,
			outline: 0,
			borderColor: `${color.link} !important`,
			boxShadow: [[0, 0, 0, 2, color.focus]],
		},
		...prismTheme({ color }),
	},
});

export interface EditorProps extends JssInjectedProps {
	code: string;
	onChange: (code: string) => void;
}

interface EditorState {
	code: string;
	prevCode: string;
}

export class Editor extends Component<EditorProps> {
	public static propTypes = {
		code: PropTypes.string.isRequired,
		onChange: PropTypes.func.isRequired,
		classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	};

	public state = { code: this.props.code, prevCode: this.props.code };

	public static getDerivedStateFromProps(nextProps: EditorProps, prevState: EditorState) {
		const { code } = nextProps;
		if (prevState.prevCode !== code) {
			return {
				prevCode: code,
				code,
			};
		}
		return null;
	}

	public shouldComponentUpdate(nextProps: EditorProps, nextState: EditorState) {
		return nextState.code !== this.state.code;
	}

	private handleChange = (code: string) => {
		this.setState({ code });
		this.props.onChange(code);
	};

	public render() {
		return (
			<SimpleEditor
				className={this.props.classes.root}
				value={this.state.code}
				onValueChange={this.handleChange}
				highlight={highlight}
				// Padding should be passed via a prop (not CSS) for a proper
				// cursor position calculation
				padding={space[2]}
			/>
		);
	}
}

export default Styled<EditorProps>(styles)(Editor);
