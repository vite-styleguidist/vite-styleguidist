// This two functions should be in the same file because of cyclic imports

import fs from 'node:fs';
import path from 'node:path';
import _ from 'lodash';
import { importDefault } from './importIt.js';
import { isMdxFile, isMdxAvailable, MissingMdxError } from './mdx.js';
import getComponentFiles from './getComponentFiles.js';
import getComponents from './getComponents.js';
import slugger from './slugger.js';
import { examplesId, mdxId } from '../../vite/ids.js';
import type * as Rsg from '../../typings/index.js';

function processSectionContent(
	section: Rsg.ConfigSection,
	config: Rsg.SanitizedStyleguidistConfig
): Rsg.ImportMarker | Rsg.MarkdownExample | undefined {
	if (!section.content) {
		return undefined;
	}

	const contentRelativePath = section.content;

	if (_.isFunction(contentRelativePath)) {
		return {
			type: 'markdown',
			content: contentRelativePath(),
		};
	}

	// Try to load section content file
	const contentAbsolutePath = path.resolve(config.configDir, contentRelativePath);
	if (!fs.existsSync(contentAbsolutePath)) {
		throw new Error(`Styleguidist: Section content file not found: ${contentAbsolutePath}`);
	}
	if (isMdxFile(contentAbsolutePath)) {
		// Named explicitly in the config, so a missing @mdx-js/mdx is an error, not a warning
		if (!isMdxAvailable(config.configDir)) {
			throw new MissingMdxError(contentAbsolutePath);
		}
		return importDefault(mdxId({ file: contentAbsolutePath }));
	}
	return importDefault(examplesId({ file: contentAbsolutePath }));
}

const getSectionComponents = (
	section: Rsg.ConfigSection,
	config: Rsg.SanitizedStyleguidistConfig
) => {
	let ignore = config.ignore ? _.castArray(config.ignore) : [];
	if (section.ignore) {
		ignore = ignore.concat(_.castArray(section.ignore));
	}

	return getComponents(getComponentFiles(section.components, config.configDir, ignore), config);
};

/**
 * Return object for one level of sections.
 *
 * @param {Array} sections
 * @param {object} config
 * @param {number} parentDepth
 * @returns {Array}
 */
export default function getSections(
	sections: Rsg.ConfigSection[],
	config: Rsg.SanitizedStyleguidistConfig,
	parentDepth?: number
): Rsg.LoaderSection[] {
	return sections.map((section) => processSection(section, config, parentDepth));
}

/**
 * Return an object for a given section with all components and subsections.
 * @param {object} section
 * @param {object} config
 * @param {number} parentDepth
 * @returns {object}
 */
export function processSection(
	section: Rsg.ConfigSection,
	config: Rsg.SanitizedStyleguidistConfig,
	parentDepth?: number
): Rsg.LoaderSection {
	const content = processSectionContent(section, config);

	let sectionDepth;

	if (parentDepth === undefined) {
		sectionDepth = section.sectionDepth !== undefined ? section.sectionDepth : 0;
	} else {
		sectionDepth = parentDepth === 0 ? 0 : parentDepth - 1;
	}

	return {
		...section,
		exampleMode: section.exampleMode || config.exampleMode,
		usageMode: section.usageMode || config.usageMode,
		sectionDepth,
		slug: `section-${slugger.slug(section.name || 'untitled')}`,
		sections: getSections(section.sections || [], config, sectionDepth),
		href: section.href,
		components: getSectionComponents(section, config),
		content,
	};
}
