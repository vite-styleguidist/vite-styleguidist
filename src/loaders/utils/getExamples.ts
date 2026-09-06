import fs from 'node:fs';
import createLogger from 'glogg';
import { importDefault } from './importIt.js';
import { isMdxFile, isMdxAvailable, missingMdxMessage, MissingMdxError } from './mdx.js';
import { defaultGetExampleFilename } from '../../scripts/schemas/config.js';
import { examplesId, mdxId } from '../../vite/ids.js';
import type * as Rsg from '../../typings/index.js';

const logger = createLogger('rsg');

/**
 * Get an import marker for the examples module of a component: its examples file
 * if it exists, or the default example if one was configured, or null.
 *
 * The extension of the file selects the pipeline: `.mdx` goes through @mdx-js/mdx
 * (`rsg-mdx:`), anything else through the Markdown one (`rsg-examples:`).
 */
export default function getExamples(
	config: Rsg.SanitizedStyleguidistConfig,
	file: string,
	displayName: string,
	examplesFile?: string | false,
	defaultExample?: string | false
): Rsg.ImportMarker | null {
	const hasExamplesFile = !!(examplesFile && fs.existsSync(examplesFile));
	const examplesFileToLoad = (hasExamplesFile && examplesFile) || defaultExample;
	if (!examplesFileToLoad) {
		return null;
	}

	if (isMdxFile(examplesFileToLoad) && !isMdxAvailable(config.configDir)) {
		// A file *we* found (the default getExampleFilename now looks for `.mdx` too) is
		// skipped with a warning: a style guide that happens to have an unrelated Readme.mdx
		// in a component folder must keep building exactly as it did before. A file the user
		// named — a custom getExampleFilename, or the defaultExample option — is an error:
		// they asked for that file, failing silently would be worse.
		if (hasExamplesFile && config.getExampleFilename === defaultGetExampleFilename) {
			logger.warn(missingMdxMessage(examplesFileToLoad));
			return null;
		}
		throw new MissingMdxError(examplesFileToLoad);
	}

	const moduleId = isMdxFile(examplesFileToLoad) ? mdxId : examplesId;
	return importDefault(
		moduleId({
			file: examplesFileToLoad,
			displayName,
			componentPath: file,
			// Only the default example template contains `__COMPONENT__` placeholders
			shouldShowDefaultExample: !hasExamplesFile && !!defaultExample,
		})
	);
}

/**
 * Would this examples file actually produce examples? `false` for an `.mdx` file that is
 * skipped because @mdx-js/mdx is missing (see above), so that `hasExamples` and
 * `skipComponentsWithoutExample` agree with what the style guide can really show.
 */
export function isUsableExampleFile(
	config: Rsg.SanitizedStyleguidistConfig,
	file: string | false | undefined
): boolean {
	if (!file || !fs.existsSync(file)) {
		return false;
	}
	return !isMdxFile(file) || isMdxAvailable(config.configDir);
}
