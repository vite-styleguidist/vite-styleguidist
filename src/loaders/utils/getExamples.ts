import fs from 'node:fs';
import { importDefault } from './importIt.js';
import { examplesId } from '../../vite/ids.js';
import type * as Rsg from '../../typings/index.js';

/**
 * Get an import marker for the examples module of a component: its examples file
 * if it exists, or the default example if one was configured, or null.
 */
export default function getExamples(
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

	return importDefault(
		examplesId({
			file: examplesFileToLoad,
			displayName,
			componentPath: file,
			// Only the default example template contains `__COMPONENT__` placeholders
			shouldShowDefaultExample: !hasExamplesFile && !!defaultExample,
		})
	);
}
