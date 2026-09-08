/**
 * A style guide that replaces `ReactComponent` through `styleguideComponents` still gets
 * its documentation (`lazyDocs`, ADR 0019 point 5 and 8, Cookbook “What a replaced
 * ReactComponent sees”).
 *
 * All of the on-demand loading lives in Styleguidist’s own `ReactComponent`, so a
 * replacement — which is aliased over the whole module — used to mount instead of it and
 * nothing ever called `component.loadDocs()`. Every component of such a guide rendered the
 * empty placeholder for good, with a clean console.
 *
 * The replacement below is the worst case on purpose: it renders neither the anchor nor the
 * heading, which is the variant the Cookbook explicitly says still works.
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import renderStyleguide from '../renderStyleguide.js';
import { resetComponentDocs, subscribeToTree } from '../componentDocs.js';
import type * as Rsg from '../../../typings/index.js';

vi.mock('rsg-components/ReactComponent', () => ({
	default: ({ component }: { component: Rsg.Component }) => (
		<div data-testid={`replaced-${component.name}`}>
			<span data-testid="loaded">{String(component.docsLoaded)}</span>
			<span data-testid="description">
				{component.props?.description || '(no description yet)'}
			</span>
			<span data-testid="counts">
				{(component.props?.examples || []).length} examples,{' '}
				{(component.props?.props || []).length} props
			</span>
		</div>
	),
}));

const location = { hash: '', search: '', pathname: '' };
const doc = { title: 'test' };
const history = { replaceState: () => {} };

const styleguide = () =>
	({
		config: { title: 'My Style Guide', pagePerSection: false },
		welcomeScreen: false,
		patterns: ['components/**.js'],
		sections: [
			{
				exampleMode: 'collapse',
				usageMode: 'collapse',
				slug: 'section',
				sections: [],
				components: [
					{
						slug: 'alpha',
						filepath: 'components/Alpha.js',
						pathLine: 'components/Alpha.js',
						nameFromPath: 'Alpha',
						loadDocs: () =>
							Promise.resolve({
								props: {
									displayName: 'Alpha',
									description: 'ALPHA DESCRIPTION MARKER.',
									props: [{ name: 'kind' }],
									examples: [{ type: 'code', content: '<Alpha />' }],
								},
							}),
					},
				],
			},
		],
	}) as any;

beforeEach(() => {
	resetComponentDocs();
});

it('should load the documentation of a component whose renderer never asks for it', async () => {
	const data = styleguide();
	const { rerender, getByTestId } = render(renderStyleguide(data, 1, location, doc, history));

	// The guide re-renders itself when documentation arrives; here that is this line
	subscribeToTree(() => rerender(renderStyleguide(data, 1, location, doc, history)));

	expect(getByTestId('description')).toHaveTextContent('(no description yet)');

	await waitFor(() =>
		expect(getByTestId('description')).toHaveTextContent('ALPHA DESCRIPTION MARKER.')
	);
	expect(getByTestId('loaded')).toHaveTextContent('true');
	expect(getByTestId('counts')).toHaveTextContent('1 examples, 1 props');
});
