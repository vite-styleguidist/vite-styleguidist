import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import TableOfContents from './TableOfContents.js';
import { TableOfContentsRenderer } from './TableOfContentsRenderer.js';
import Context from '../Context/index.js';

const components = [
	{
		visibleName: 'Button',
		name: 'Button',
		href: '#button',
		slug: 'button',
	},
	{
		visibleName: 'Input',
		name: 'Input',
		href: '#input',
		slug: 'input',
	},
	{
		visibleName: 'Textarea',
		name: 'Textarea',
		href: '#textarea',
		slug: 'textarea',
	},
];

const sections = [
	{
		visibleName: 'Introduction',
		name: 'Introduction',
		href: '#introduction',
		slug: 'introduction',
		content: 'intro.md',
	},
	{
		visibleName: 'Buttons',
		name: 'Buttons',
		href: '#buttons',
		slug: 'buttons',
		components: [
			{
				visibleName: 'Button',
				name: 'Button',
				href: '#button',
				slug: 'button',
			},
		],
	},
	{
		visibleName: 'Forms',
		name: 'Forms',
		href: '#forms',
		slug: 'forms',
		components: [
			{
				visibleName: 'Input',
				name: 'Input',
				href: '#input',
				slug: 'input',
			},
			{
				visibleName: 'Textarea',
				name: 'Textarea',
				href: '#textarea',
				slug: 'textarea',
			},
		],
	},
];

it('should filter list when search field contains a query', () => {
	const searchTerm = 'put';
	const { getByPlaceholderText, getAllByTestId, getByTestId } = render(
		<TableOfContents
			sections={[
				{
					visibleName: 'Input',
					href: '#input',
					components,
				},
			]}
			tocMode="expand"
		/>
	);
	expect(getAllByTestId('rsg-toc-link').length).toBe(3);
	fireEvent.change(getByPlaceholderText('Filter by name'), { target: { value: searchTerm } });
	expect(getAllByTestId('rsg-toc-link')).toHaveLength(1);
	expect(getByTestId('rsg-toc-link')).toHaveTextContent('Input');
});

it('should filter section names', () => {
	const searchTerm = 'frm';
	const { getByPlaceholderText, getAllByTestId, getByTestId } = render(
		<TableOfContents sections={sections} />
	);
	expect(getAllByTestId('rsg-toc-link').length).toBe(6);
	fireEvent.change(getByPlaceholderText('Filter by name'), { target: { value: searchTerm } });
	expect(getAllByTestId('rsg-toc-link')).toHaveLength(1);
	expect(getByTestId('rsg-toc-link')).toHaveTextContent('Forms');
});

it('should call a callback when input value changed', () => {
	const onSearchTermChange = vi.fn();
	const searchTerm = 'foo';
	const newSearchTerm = 'bar';
	const { getByRole } = render(
		<TableOfContentsRenderer
			classes={{}}
			searchTerm={searchTerm}
			onSearchTermChange={onSearchTermChange}
		>
			<div>foo</div>
		</TableOfContentsRenderer>
	);

	fireEvent.change(getByRole('textbox'), { target: { value: newSearchTerm } });

	expect(onSearchTermChange).toHaveBeenCalledWith(newSearchTerm);
});

it('should render subsections of a single root section as the top level', () => {
	const { getAllByTestId } = render(
		<TableOfContents
			sections={[
				{
					sections: [
						{ visibleName: 'Intro', slug: 'intro', href: '#intro', content: 'intro.md' },
						{ visibleName: 'Chapter', slug: 'chapter', href: '#chapter', content: 'chapter.md' },
					],
				},
			]}
		/>
	);

	const links = getAllByTestId('rsg-toc-link');
	expect(links.map((node) => node.textContent)).toEqual(['Intro', 'Chapter']);
	// Both links belong to the same (root) list: the wrapping section isn't rendered
	expect(links[0].closest('ul')).toBe(links[1].closest('ul'));
});

it('should render components of a single top section as root', () => {
	const { getAllByTestId } = render(<TableOfContents sections={[{ components }]} />);

	const links = getAllByTestId('rsg-toc-link');
	expect(links.map((node) => node.textContent)).toEqual(['Button', 'Input', 'Textarea']);
	expect(links.map((node) => node.getAttribute('href'))).toEqual([
		'#button',
		'#input',
		'#textarea',
	]);
	expect(links[0].closest('ul')).toBe(links[2].closest('ul'));
});

it('should open the link in a new tab only for external links', () => {
	const { getByText } = render(
		<TableOfContents
			sections={[
				{
					sections: [
						{
							visibleName: 'Intro',
							slug: 'intro',
							href: 'http://example.com',
							content: 'intro.md',
						},
						// `external` alone isn't enough: the section must have been resolved to an
						// external link by the loader (externalLink)
						{ visibleName: 'Chapter', slug: 'chapter', href: 'http://example.com', external: true },
						{
							visibleName: 'Docs',
							slug: 'docs',
							href: 'http://example.com',
							external: true,
							externalLink: true,
						},
					],
				},
			]}
		/>
	);

	expect(getByText('Intro')).not.toHaveAttribute('target');
	expect(getByText('Chapter')).not.toHaveAttribute('target');
	expect(getByText('Docs')).toHaveAttribute('target', '_blank');
});

/**
 * testing this layer with no mocking makes no sense...
 */
it('should render components with useRouterLinks', () => {
	const { getAllByRole } = render(
		<TableOfContents
			useRouterLinks
			sections={[
				{
					sections: [
						{
							visibleName: '1',
							name: 'Components',
							href: '#/Components',
							slug: 'components',
							content: 'intro.md',
						},
						{
							visibleName: '2',
							content: 'chapter.md',
							href: '#/Chap',
							slug: 'chap',
						},
					],
				},
			]}
		/>
	);

	expect((getAllByRole('link')[0] as any).href).toMatch(/\/#\/Components$/);
});

/**
 * testing this layer with no mocking makes no sense...
 * This test should not exist but for good coverage policy this is necessary
 */
it('should detect sections containing current selection when tocMode is collapse', () => {
	const context = {
		config: {
			tocMode: 'collapse',
		},
	};

	const Provider = (props: any) => <Context.Provider value={context} {...props} />;

	const { getByText } = render(
		<Provider>
			<TableOfContents
				tocMode="collapse"
				sections={[
					{
						sections: [
							{
								visibleName: '1',
								href: '#/components',
								slug: 'components',
								sections: [{ visibleName: '1.1', href: '#/button', slug: 'button' }],
							},
							{
								visibleName: '2',
								href: '#/chap',
								slug: 'chap',
								content: 'chapter.md',
								sections: [{ visibleName: '2.1', href: '#/chapter-1', slug: 'chapter-1' }],
							},
							{
								visibleName: '3',
								href: 'http://react-styleguidist.com',
								slug: 'react-styleguidist',
							},
						],
					},
				]}
				loc={{ pathname: '', hash: 'button' }}
			/>
		</Provider>
	);

	expect(getByText('1.1')).not.toBeEmptyDOMElement();
});

it('should show sections with expand: true when tocMode is collapse', () => {
	const { getByText } = render(
		<TableOfContents
			tocMode="collapse"
			sections={[
				{
					sections: [
						{
							visibleName: '1',
							expand: true,
							href: '#/components',
							slug: 'components',
							sections: [{ visibleName: '1.1', href: '#/button', slug: 'button' }],
						},
						{
							visibleName: '2',
							href: '#/chap',
							slug: 'chap',
							content: 'chapter.md',
							sections: [{ visibleName: '2.1', href: '#/chapter-1', slug: 'chapter-1' }],
						},
						{
							visibleName: '3',
							href: 'http://react-styleguidist.com',
							slug: 'react-styleguidist',
						},
					],
				},
			]}
		/>
	);
	expect(getByText('1.1')).toBeVisible();
});
