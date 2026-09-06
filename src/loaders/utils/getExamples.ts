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
			warnSkippedMdxFile(examplesFileToLoad);
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
 * Files already reported as “skipped, @mdx-js/mdx is missing”, so that a component is not
 * announced twice: `isUsableExampleFile()` runs for every component (processComponent) and
 * `getExamples()` runs again for the ones that survive `skipComponentsWithoutExample`.
 */
const warnedMdxFiles = new Set<string>();

/** The documented “please install @mdx-js/mdx”, at most once per file per run. */
function warnSkippedMdxFile(file: string): void {
	if (warnedMdxFiles.has(file)) {
		return;
	}
	warnedMdxFiles.add(file);
	logger.warn(missingMdxMessage(file));
}

/** Only exported for tests: forget which files have already been warned about. */
export function clearMdxWarnings(): void {
	warnedMdxFiles.clear();
}

/**
 * Would this examples file actually produce examples? `false` for an `.mdx` file that is
 * skipped because @mdx-js/mdx is missing (see above), so that `hasExamples` and
 * `skipComponentsWithoutExample` agree with what the style guide can really show.
 *
 * The diagnostic belongs here as well as in getExamples(): with
 * `skipComponentsWithoutExample` the component is filtered out on this answer alone and
 * getExamples() is never reached, so this is the only place that can say why the component
 * vanished. Same rule as getExamples(): a file we found ourselves warns, a file the user
 * named (a custom `getExampleFilename`) throws.
 */
export function isUsableExampleFile(
	config: Rsg.SanitizedStyleguidistConfig,
	file: string | false | undefined
): boolean {
	if (!file || !fs.existsSync(file)) {
		return false;
	}
	if (!isMdxFile(file) || isMdxAvailable(config.configDir)) {
		return true;
	}
	if (config.getExampleFilename !== defaultGetExampleFilename) {
		throw new MissingMdxError(file);
	}
	warnSkippedMdxFile(file);
	return false;
}
