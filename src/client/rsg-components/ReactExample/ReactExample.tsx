import React, { Component } from 'react';
import PropTypes from 'prop-types';
import type { Options as TransformOptions } from 'sucrase';
import Wrapper from 'rsg-components/Wrapper';
import compileCode, { DEFAULT_COMPILER_CONFIG } from '../../utils/compileCode.js';
import splitExampleCode from '../../utils/splitExampleCode.js';

interface ReactExampleProps {
	code: string;
	evalInContext(code: string): () => any;
	onError(err: Error): void;
	compilerConfig?: TransformOptions;
}

export default class ReactExample extends Component<ReactExampleProps> {
	public static propTypes = {
		code: PropTypes.string.isRequired,
		evalInContext: PropTypes.func.isRequired,
		onError: PropTypes.func.isRequired,
		compilerConfig: PropTypes.object,
	};

	public shouldComponentUpdate(nextProps: ReactExampleProps) {
		return this.props.code !== nextProps.code;
	}

	// Run example code and return the last top-level expression
	private getExampleComponent(compiledCode: string): () => any {
		return this.props.evalInContext(`
			${compiledCode}
		`);
	}

	public render() {
		const { code, compilerConfig = DEFAULT_COMPILER_CONFIG, onError } = this.props;
		const compiledCode = compileCode(code, compilerConfig, onError);
		if (!compiledCode) {
			return null;
		}

		const { example } = splitExampleCode(compiledCode);
		const ExampleComponent = this.getExampleComponent(example);
		const wrappedComponent = (
			<Wrapper onError={onError}>
				<ExampleComponent />
			</Wrapper>
		);
		return wrappedComponent;
	}
}
