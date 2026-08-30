import React from 'react';
import { render } from '@testing-library/react';
import Components from './Components.js';
import ComponentsRenderer from './ComponentsRenderer.js';
import Context from '../Context/index.js';
import slots from '../slots/index.js';
import { DisplayModes, ExampleModes, UsageModes } from '../../consts.js';

const exampleMode = ExampleModes.collapse;
const usageMode = UsageModes.collapse;
const components = [
	{
		name: 'Foo',
		visibleName: 'Foo',
		slug: 'foo',
		pathLine: 'components/foo.js',
		filepath: 'components/foo.js',
		props: {
			description: 'Foo foo',
		},
	},
	{
		name: 'Bar',
		visibleName: 'Bar',
		slug: 'bar',
		pathLine: 'components/bar.js',
		filepath: 'components/bar.js',
		props: {
			description: 'Bar bar',
		},
	},
];

// ReactComponent renders toolbar and tab slots, so the default slots must be in the context
const context = {
	config: {},
	codeRevision: 0,
	cssRevision: '0',
	displayMode: DisplayModes.all,
	slots: slots(),
};

const Provider = (props: any) => <Context.Provider value={context as any} {...props} />;

it('should render components list', () => {
	const { getAllByRole, getByText } = render(
		<Provider>
			<Components
				components={components}
				exampleMode={exampleMode}
				usageMode={usageMode}
				depth={3}
			/>
		</Provider>
	);

	// One section heading per component, at the requested depth
	expect(getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
		'Foo',
		'Bar',
	]);
	expect(getByText('Foo foo')).toBeInTheDocument();
	expect(getByText('Bar bar')).toBeInTheDocument();
});

it('renderer should render components list layout', () => {
	const { container, getByTestId } = render(
		<ComponentsRenderer>
			<div data-testid="first" />
			<div data-testid="second" />
		</ComponentsRenderer>
	);

	expect(container.firstChild).toContainElement(getByTestId('first'));
	expect(container.firstChild).toContainElement(getByTestId('second'));
});
