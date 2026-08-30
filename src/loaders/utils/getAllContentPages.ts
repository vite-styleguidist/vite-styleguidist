import type * as Rsg from '../../typings/index.js';

/**
 * Get all section content pages.
 *
 * @param {Array} sections
 * @returns {Array}
 */
export default function getAllContentPages(
	sections: Rsg.LoaderSection[]
): (Rsg.MarkdownExample | Rsg.ImportMarker)[] {
	return sections.reduce((pages: (Rsg.MarkdownExample | Rsg.ImportMarker)[], section) => {
		if (section.content) {
			pages = pages.concat([section.content]);
		}

		if (section.sections) {
			pages = pages.concat(getAllContentPages(section.sections));
		}

		return pages;
	}, []);
}
