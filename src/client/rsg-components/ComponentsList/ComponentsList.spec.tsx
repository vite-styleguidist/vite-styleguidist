import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import ComponentsList from './ComponentsList.js';
import { styles } from './ComponentsListRenderer.js';
import createStyleSheet from '../../styles/createStyleSheet.js';
import Context from '../Context/index.js';

const context = {
	config: {
		pagePerSection: true,
		tocMode: 'collapse',
	},
};

const Provider = (props: any) => <Context.Provider value={context} {...props} />;

it('should not render any links when the list is empty', () => {
	const { queryAllByRole } = render(
		<Provider>
			<ComponentsList items={[]} />
		</Provider>
	);

	expect(queryAllByRole('link')).toHaveLength(0);
});

it('should ignore items without visibleName', () => {
	const components = [
		{
			visibleName: 'Button',
			slug: 'button',
			href: '#button',
		},
		{
			slug: 'input',
			href: '#input',
		},
	];

	const { getAllByRole } = render(
		<Provider>
			<ComponentsList items={components} />
		</Provider>
	);

	expect(Array.from(getAllByRole('link')).map((node) => (node as HTMLAnchorElement).href)).toEqual([
		'http://localhost/#button',
	]);
});

it('should show content of items that are open and not what is closed', () => {
	const components = [
		{
			visibleName: 'Button',
			name: 'Button',
			slug: 'button',
			href: '#buttton',
			content: <div data-testid="content">Content for Button</div>,
		},
		{
			visibleName: 'Input',
			name: 'Input',
			slug: 'input',
			href: '#input',
			content: <div data-testid="content">Content for Input</div>,
		},
	];

	const { getAllByTestId, getByText } = render(
		<Provider>
			<ComponentsList items={components} />
		</Provider>
	);

	fireEvent.click(getByText('Button'));

	expect(
		Array.from(getAllByTestId('content')).map((node) => (node as HTMLDivElement).innerHTML)
	).toEqual(['Content for Button']);
});

it('should show content of initialOpen items even if they are not active', () => {
	const components = [
		{
			visibleName: 'Button',
			name: 'Button',
			slug: 'button',
			href: '#button',
			content: <div data-testid="content">Content for Button</div>,
		},
		{
			visibleName: 'Input',
			name: 'Input',
			slug: 'input',
			href: '#input',
			content: <div data-testid="content">Content for Input</div>,
			initialOpen: true,
		},
	];

	const { getAllByTestId, getByText } = render(
		<Provider>
			<ComponentsList items={components} />
		</Provider>
	);

	fireEvent.click(getByText('Button'));

	expect(
		Array.from(getAllByTestId('content')).map((node) => (node as HTMLDivElement).innerHTML)
	).toEqual(['Content for Button', 'Content for Input']);
});

it('should show content of forcedOpen items even if they are initially collapsed', () => {
	const components = [
		{
			visibleName: 'Button',
			name: 'Button',
			slug: 'button',
			href: '#button',
			content: <div data-testid="content">Content for Button</div>,
			initialOpen: true,
		},
		{
			visibleName: 'Input',
			name: 'Input',
			slug: 'input',
			href: '#input',
			content: <div data-testid="content">Content for Input</div>,
			initialOpen: true,
			forcedOpen: true,
		},
	];

	const { getAllByTestId, getByText } = render(
		<Provider>
			<ComponentsList items={components} />
		</Provider>
	);

	fireEvent.click(getByText('Input'));

	expect(
		Array.from(getAllByTestId('content')).map((node) => (node as HTMLDivElement).innerHTML)
	).toEqual(['Content for Button', 'Content for Input']);
});

/**
 * The `styles` config option merges into the component's own rules, so anything the
 * component declares through a higher-specificity selector (`&&`) can never be
 * overridden by it. Only the properties Link itself declares for the base state of a
 * link need that treatment; everything else has to stay on the plain single-class rule,
 * where an override lands and wins (QA F7).
 */
it('should let the styles option override the base declarations of a list link', () => {
	const sheet = createStyleSheet(
		styles,
		{
			styles: {
				ComponentsList: {
					link: { padding: 0, backgroundColor: 'rgb(255, 0, 0)' },
				},
			},
		} as any,
		'ComponentsList',
		'components-list-override'
	);
	const linkClass = sheet.classes.link;
	const blocks = Array.from(sheet.toString().matchAll(/([^{}]+)\{([^{}]*)\}/g)).map(
		([, selector, body]) => ({ selector: selector.trim(), body })
	);

	// The override is emitted on the plain rule, with a single-class selector
	const base = blocks.find((block) => block.selector === `.${linkClass}`);
	expect(base).toBeDefined();
	expect(base?.body).toMatch(/background-color: rgb\(255, 0, 0\)/);
	expect(base?.body).toMatch(/padding: 0/);

	// and the doubled-class rule that outranks Link only carries what it has to: the
	// properties Link declares for `&, &:link, &:visited`
	const doubled = blocks.find((block) =>
		block.selector.startsWith(`.${linkClass}.${linkClass},`)
	);
	expect(doubled?.selector).toBe(
		`.${linkClass}.${linkClass}, .${linkClass}.${linkClass}:link, .${linkClass}.${linkClass}:visited`
	);
	const declared = Array.from((doubled?.body || '').matchAll(/^\s*([a-z-]+):/gm)).map(
		([, property]) => property
	);
	expect(declared.sort()).toEqual(['color', 'text-decoration', 'transition']);
});

/**
 * The selected row's accent edge is an absolutely positioned pseudo-element, so the row
 * itself has to be its containing block. `position` cannot live on the plain rule: the
 * element also carries the Link component's own class, whose jss-plugin-isolate reset is
 * attached after this sheet and sets `position: static` at the same specificity — the
 * edge then escapes to the fixed sidebar and paints a bar down the whole viewport
 * (which is exactly what the first build of this design did).
 */
it('should position the accent edge of the selected row against the row', () => {
	const sheet = createStyleSheet(styles, {} as any, 'ComponentsList', 'components-list-rail');
	const linkClass = sheet.classes.link;
	const css = sheet.toString();
	const blocks = Array.from(css.matchAll(/([^{}]+)\{([^{}]*)\}/g)).map(([, selector, body]) => ({
		selector: selector.trim(),
		body,
	}));

	const positioned = blocks.find((block) => block.selector === `.${linkClass}.${linkClass}`);
	expect(positioned?.body).toMatch(/position: relative/);

	// The rest of the row's box has to sit at the same specificity, and nowhere else: the
	// isolate reset matches a Link through `.link:link` (one class + one pseudo-class) and
	// flattens every one of these on a single-class rule — which is why the rows had no
	// padding, no radius and no ellipsis before 1.0
	for (const property of ['padding', 'border-radius', 'overflow', 'white-space', 'cursor']) {
		expect(positioned?.body).toMatch(new RegExp(`${property}:`));
	}
	const plain = blocks.find((block) => block.selector === `.${linkClass}`);
	expect(plain?.body).not.toMatch(/padding:/);

	const rail = blocks.find((block) => block.selector.endsWith('::before'));
	expect(rail?.selector).toBe(
		`.${sheet.classes.isSelected} > .${linkClass}.${linkClass}::before`
	);
	expect(rail?.body).toMatch(/position: absolute/);
});
