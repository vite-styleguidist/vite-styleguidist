import React, { Component } from 'react';
import ComponentsList from 'rsg-components/ComponentsList';
import TableOfContentsRenderer from 'rsg-components/TableOfContents/TableOfContentsRenderer';
import filterSectionsByName from '../../utils/filterSectionsByName.js';
import { getHash } from '../../utils/handleHash.js';
import type * as Rsg from '../../../typings/index.js';

interface TableOfContentsProps {
	sections: Rsg.Section[];
	useRouterLinks?: boolean;
	tocMode?: string;
	loc?: { hash: string; pathname: string };
	/**
	 * Slug of the section the reader has scrolled to, from the scroll spy
	 * (`scrollSync`, ADR 0015). When set it decides which entry is selected; when
	 * `undefined` — scroll sync off, or nothing detected yet — selection comes from the
	 * route exactly as it always has.
	 */
	activeSlug?: string;
}

interface RenderedLevel {
	content: React.ReactElement;
	containsSelected: boolean;
	/**
	 * The entries of this level for the small-screen chip row: `selected` also covers an
	 * entry whose subtree holds the current route, so the chip of the current section
	 * stays highlighted while one of its components is shown.
	 */
	items: Rsg.TOCItem[];
}

/** A route without its `?id=` query: `/#/Components/Buttons?id=button` -> `/#/Components/Buttons` */
const trimQuery = (route: string): string => route.split('?')[0];

export default class TableOfContents extends Component<TableOfContentsProps> {
	public state = {
		searchTerm: '',
	};

	/**
	 * Whether a top-level entry is the one the current route belongs to.
	 *
	 * The list links match the route exactly, which leaves the chip row without a
	 * current entry on a subsection page: in `pagePerSection` the sidebar never links to
	 * `#/Components/Buttons` itself, so nothing carries the `Components` route while a
	 * subsection is shown. The chips therefore also accept a prefix match on the route
	 * (the part before `?id=`), which is what a breadcrumb-like row is expected to do.
	 */
	private isCurrentChip(item: Rsg.TOCItem): boolean {
		if (item.selected) {
			return true;
		}
		// Once the scroll spy has an answer, `selected` above is the whole answer: the route
		// still points at the entry the reader clicked, and the prefix match below would
		// light that chip as well and show two current chips at once.
		if (this.props.activeSlug !== undefined) {
			return false;
		}
		if (!item.href || item.external) {
			return false;
		}
		const { hash, pathname } = this.props.loc ?? window.location;
		const { useRouterLinks } = this.props;
		// The same two spaces renderLevel() compares in: the raw hash with router links,
		// the hash without its `#/` prefix without them
		const route = trimQuery(pathname + (useRouterLinks ? hash : getHash(hash)));
		const entry = trimQuery(useRouterLinks ? item.href : getHash(item.href));
		// A route of `/#/` (or an empty one) is a prefix of every other route
		if (!entry || entry.endsWith('/')) {
			return false;
		}
		return route === entry || route.startsWith(`${entry}/`);
	}

	private renderLevel(
		sections: Rsg.TOCItem[],
		useRouterLinks = false,
		hashPath: string[] = [],
		useHashId = false
	): RenderedLevel {
		// Match selected component in both basic routing and pagePerSection routing.
		const { hash, pathname } = this.props.loc ?? window.location;
		const windowHash = pathname + (useRouterLinks ? hash : getHash(hash));
		const { activeSlug } = this.props;

		let childrenContainSelected = false;
		const items: Rsg.TOCItem[] = [];
		const processedItems = sections.map((section) => {
			const children = [...(section.sections || []), ...(section.components || [])];
			const sectionDepth = section.sectionDepth || 0;
			const childHashPath =
				sectionDepth === 0 && useHashId
					? hashPath
					: [...hashPath, section.name ? section.name : '-'];

			const { content, containsSelected } =
				children.length > 0
					? this.renderLevel(children, useRouterLinks, childHashPath, sectionDepth === 0)
					: { content: undefined, containsSelected: false };

			const routeSelected =
				(!useRouterLinks && section.href ? getHash(section.href) : section.href) === windowHash;
			// The scroll spy wins over the route: with `scrollSync: 'selection'` the URL is
			// never rewritten, so the route still names the entry the reader clicked minutes
			// ago and would fight the highlight for the section actually on screen. The route
			// is what decides before the spy has an answer (a deep link, a fresh load) and
			// whenever scroll sync is off, which is what keeps the pre-1.0 behaviour intact.
			const selected = activeSlug === undefined ? routeSelected : section.slug === activeSlug;

			if (containsSelected || selected) {
				childrenContainSelected = true;
			}

			const shouldOpenInNewTab = !!section.external && !!section.externalLink;
			items.push({ ...section, selected: selected || containsSelected, shouldOpenInNewTab });

			return {
				...section,
				heading: !!section.name && children.length > 0,
				content,
				selected,
				// Kept separate from `selected`: while the subtree is open the child carries the
				// mark itself, and marking both would show two current entries. It is the
				// collapsed case the renderer needs it for.
				containsSelected,
				shouldOpenInNewTab,
				initialOpen: this.props.tocMode !== 'collapse' || containsSelected || section.expand,
				forcedOpen: !!this.state.searchTerm.length,
			};
		});
		return {
			content: <ComponentsList items={processedItems} />,
			containsSelected: childrenContainSelected,
			items,
		};
	}

	private renderSections(): {
		content: React.ReactElement;
		chips: Rsg.TOCItem[];
		hasMatches: boolean;
	} {
		const { searchTerm } = this.state;
		const { sections, useRouterLinks } = this.props;
		// If there is only one section, we treat it as a root section
		// In this case the name of the section won't be rendered and it won't get left padding
		// Since a section can contain only other sections,
		// we need to make sure not to loose the subsections.
		// We will treat those subsections as the new roots.
		const firstLevel =
			sections.length === 1
				? // only use subsections if there actually are subsections
					sections[0].sections && sections[0].sections.length
					? sections[0].sections
					: sections[0].components
				: sections;
		const topLevel = (firstLevel || []) as Rsg.TOCItem[];

		if (!searchTerm) {
			const { content, items } = this.renderLevel(topLevel, useRouterLinks);
			return { content, chips: items, hasMatches: true };
		}

		// The chip row keeps listing every top-level entry while the list is filtered, so
		// the two come from separate passes (the unfiltered one only for its items)
		const filtered = filterSectionsByName(topLevel, searchTerm);
		return {
			content: this.renderLevel(filtered, useRouterLinks).content,
			chips: this.renderLevel(topLevel, useRouterLinks).items,
			hasMatches: filtered.length > 0,
		};
	}

	public render() {
		const handleSearchTermChange = (searchTerm: string) => this.setState({ searchTerm });
		const { content, chips, hasMatches } = this.renderSections();
		return (
			<TableOfContentsRenderer
				searchTerm={this.state.searchTerm}
				onSearchTermChange={handleSearchTermChange}
				hasMatches={hasMatches}
				chips={chips
					.filter((item) => item.visibleName)
					.map((item) => ({ ...item, selected: this.isCurrentChip(item) }))}
			>
				{content}
			</TableOfContentsRenderer>
		);
	}
}
