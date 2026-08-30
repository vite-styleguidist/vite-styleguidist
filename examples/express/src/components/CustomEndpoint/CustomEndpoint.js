import React, { Component } from 'react';

export default class CustomEndpoint extends Component {
	state = { response: 'No Server Response' };

	handleInvokeEndpoint = () => {
		// The endpoint is added to the style guide dev server in styleguide.config.js
		// (`configureServer`), so a relative URL works whatever host/port the server uses.
		// It doesn’t exist in a static build (`styleguidist build`).
		fetch('/custom', { method: 'GET' })
			.then((responseObj) => {
				if (!responseObj.ok) {
					throw new Error(`Server responded with ${responseObj.status}`);
				}
				return responseObj.json();
			})
			.then(({ response } = {}) => this.setState({ response, error: null }))
			.catch(() =>
				this.setState({
					response: null,
					error: 'Ouch, something went wrong!',
				})
			);
	};

	render() {
		return (
			<div>
				<div>{this.state.response}</div>
				{this.state.error ? <div>{this.state.error}</div> : null}
				<button onClick={this.handleInvokeEndpoint}>Invoke server</button>
			</div>
		);
	}
}
