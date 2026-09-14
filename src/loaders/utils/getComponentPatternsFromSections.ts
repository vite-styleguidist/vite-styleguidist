import type * as Rsg from '../../typings/index.js';

/**
 * Return all glob patterns from all sections, including the nested ones.
 *
 * NOTE: a section may carry both `components` and nested `sections` — processSection()
 * (getSections.ts) walks both, so both are collected here as well. A `components` option that
 * is a function contributes no pattern: there is no glob to show.
 * @param {Array} sections
 * @returns {Array}
 */
export default function getComponentPatternsFromSections(sections: Rsg.ConfigSection[]): string[] {
	return sections.reduce((patterns: string[], section) => {
		let sectionPatterns = patterns;

		if (Array.isArray(section.components)) {
			sectionPatterns = sectionPatterns.concat(section.components);
		} else if (typeof section.components === 'string') {
			// The default section built from a string `components` option keeps the string
			sectionPatterns = sectionPatterns.concat([section.components]);
		}

		if (section.sections) {
			sectionPatterns = sectionPatterns.concat(
				getComponentPatternsFromSections(section.sections)
			);
		}

		return sectionPatterns;
	}, []);
}
