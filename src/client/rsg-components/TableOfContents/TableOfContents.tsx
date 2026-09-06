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

export default class TableOfContents extends Component<TableOfContentsProps> {
	public state = {
		searchTerm: '',
	};

	private renderLevel(
		sections: Rsg.TOCItem[],
		useRouterLinks = false,
		hashPath: string[] = [],
		useHashId = false
	): RenderedLevel {
		// Match selected component in both basic routing and pagePerSection routing.
		const { hash, pathname } = this.props.loc ?? window.location;
		const windowHash = pathname + (useRouterLinks ? hash : getHash(hash));

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

			const selected =
				(!useRouterLinks && section.href ? getHash(section.href) : section.href) === windowHash;

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
				chips={chips.filter((item) => item.visibleName)}
			>
				{content}
			</TableOfContentsRenderer>
		);
	}
}
