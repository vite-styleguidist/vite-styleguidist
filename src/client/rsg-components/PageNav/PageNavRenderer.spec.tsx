import React from 'react';
import { render, screen } from '@testing-library/react';
import PageNavRenderer, { styles } from './PageNavRenderer.js';
import createStyleSheet from '../../styles/createStyleSheet.js';
import type { PageNavHeading } from './PageNav.js';
import * as theme from '../../styles/theme.js';
import type * as Rsg from '../../../typings/index.js';

const headings: PageNavHeading[] = [
	{ id: 'usage', text: 'Usage', level: 2, href: '#usage' },
	{ id: 'props', text: 'Props', level: 3, href: '#props' },
	{ id: 'api', text: 'API', level: 2, href: '#api' },
];

describe('PageNavRenderer', () => {
	it('should render one link per heading inside a named navigation landmark', () => {
		render(<PageNavRenderer headings={headings} title="On this page" />);

		const nav = screen.getByRole('navigation', { name: 'On this page' });
		expect(nav.className).toMatch(/^rsg--root-\d+$/);
		const links = screen.getAllByTestId('rsg-pagenav-link');
		expect(links.map((link) => link.textContent)).toEqual(['Usage', 'Props', 'API']);
		expect(links.map((link) => link.getAttribute('href'))).toEqual(['#usage', '#props', '#api']);
		expect(links.every((link) => /^rsg--link-\d+$/.test(link.className))).toBe(true);
	});

	it('should mark the active entry, and only it', () => {
		render(<PageNavRenderer headings={headings} activeId="props" title="On this page" />);

		const links = screen.getAllByTestId('rsg-pagenav-link');
		expect(links.map((link) => link.getAttribute('aria-current'))).toEqual([
			null,
			'location',
			null,
		]);
		// The marker rule the accent edge and the accent colour hang off
		expect(links[1].parentElement?.className).toMatch(/rsg--isSelected-\d+/);
		expect(links[0].parentElement?.className).not.toMatch(/rsg--isSelected-\d+/);
	});

	it('should mark h3 entries as children so they can be indented', () => {
		render(<PageNavRenderer headings={headings} title="On this page" />);

		const items = screen.getAllByTestId('rsg-pagenav-link').map((link) => link.parentElement);
		expect(items[0]?.className).not.toMatch(/rsg--isChild-\d+/);
		expect(items[1]?.className).toMatch(/rsg--isChild-\d+/);
		expect(items[2]?.className).not.toMatch(/rsg--isChild-\d+/);
	});

	it('should render the rail with a visible label', () => {
		render(<PageNavRenderer headings={headings} title="Contents" />);

		expect(screen.getByText('Contents').className).toMatch(/^rsg--title-\d+$/);
		expect(screen.queryByTestId('rsg-pagenav-summary')).toBeNull();
	});

	it('should render the collapsible block, closed, with the same links', () => {
		render(<PageNavRenderer headings={headings} title="On this page" collapsible />);

		const nav = screen.getByTestId('rsg-pagenav');
		expect(nav.className).toMatch(/rsg--isCollapsible-\d+/);
		const details = nav.querySelector('details') as HTMLDetailsElement;
		expect(details.open).toBe(false);
		expect(screen.getByTestId('rsg-pagenav-summary')).toHaveTextContent('On this page');
		// The entries are rendered either way; `<details>` hides them until it is opened
		expect(screen.getAllByTestId('rsg-pagenav-link')).toHaveLength(3);
	});

	/**
	 * The `styles` contract of ADR 0011: these rule keys are what a user targets in
	 * `styles: { PageNav: { … } }`, so they may gain siblings but must not be renamed or
	 * dropped. The colours must stay `var(--rsg-color-…)` expressions, which is what makes
	 * an override of the custom property work in both schemes.
	 */
	it('should keep its rule keys and take its colours from the tokens', () => {
		const rules = styles(theme as unknown as Rsg.Theme);
		expect(Object.keys(rules).sort()).toEqual([
			'details',
			'isChild',
			'isCollapsible',
			'isSelected',
			'item',
			'link',
			'list',
			'root',
			'summary',
			'title',
		]);
		const link = rules.link as Record<string, any>;
		expect(link.color).toBe(theme.color.light);
		expect(link.color).toMatch(/^var\(--rsg-color-light,/);
		expect(link['$isSelected > &::before'].background).toBe(theme.color.link);
	});

	/**
	 * `color.focus` is a translucent halo — 1.55:1 over the light surface, 2.19:1 over the
	 * dark one — so on its own it is under the 3:1 WCAG 2.2 SC 1.4.11 asks of a focus
	 * indicator. The opaque `color.link` ring inside it is what makes the indicator visible,
	 * and it is what the sidebar rows and the chip row already do.
	 */
	it('should give both focusable elements an opaque focus ring, not the halo alone', () => {
		const rules = styles(theme as unknown as Rsg.Theme);
		for (const key of ['link', 'summary']) {
			const rule = rules[key] as Record<string, any>;
			expect(rule['&:focus-visible'].boxShadow).toEqual([
				[0, 0, 0, 1, theme.color.link],
				[0, 0, 0, 3, theme.color.focus],
			]);
		}
	});

	// The other half of that contract: the key a user writes in the `styles` option is the
	// renderer's name without `Renderer` (rsg-components/Styled), so it has to be `PageNav`
	it('should be addressed as PageNav by the styles option', () => {
		expect((PageNavRenderer as unknown as { displayName: string }).displayName).toBe(
			'Styled(PageNav)'
		);
		const sheet = createStyleSheet(
			styles,
			{ styles: { PageNav: { link: { fontSize: 99 } } } } as any,
			'PageNav',
			// Its own revision, so this is a sheet built for this config rather than a cached one
			'pagenav-styles-override'
		);
		expect(sheet.toString()).toContain('font-size: 99px');
	});
});
