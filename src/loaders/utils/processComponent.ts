import fs from 'node:fs';
import path from 'node:path';
import getNameFromFilePath from './getNameFromFilePath.js';
import importIt, { importDefault } from './importIt.js';
import slugger from './slugger.js';
import { propsId } from '../../vite/ids.js';
import type * as Rsg from '../../typings/index.js';

/**
 * References the filepath of the metadata file.
 *
 * @param {string} filepath
 * @returns {string}
 */
function getComponentMetadataPath(filepath: string): string {
	const extname = path.extname(filepath);
	return filepath.substring(0, filepath.length - extname.length) + '.json';
}

/**
 * Return an object with all required for style guide information for a given component.
 *
 * @param {string} filepath
 * @param {object} config
 * @returns {object}
 */
export default function processComponent(
	filepath: string,
	config: Rsg.SanitizedStyleguidistConfig
): Rsg.LoaderComponent {
	const componentPath = path.relative(config.configDir, filepath);
	const componentName = getNameFromFilePath(filepath);
	const examplesFile = config.getExampleFilename(filepath);
	const componentMetadataPath = getComponentMetadataPath(filepath);
	return {
		filepath: componentPath,
		slug: slugger.slug(componentName),
		pathLine: config.getComponentPathLine(componentPath),
		module: importIt(filepath),
		props: importDefault(propsId(filepath)),
		hasExamples: !!(examplesFile && fs.existsSync(examplesFile)),
		metadata: fs.existsSync(componentMetadataPath) ? importDefault(componentMetadataPath) : {},
	};
}
