import path from 'node:path';
import type * as Rsg from '../../typings/index.js';

/**
 * Absolute paths of all Markdown files used as section content.
 */
export default function getAllContentFiles(
	sections: Rsg.ConfigSection[],
	configDir: string
): string[] {
	return sections.reduce((files: string[], section) => {
		if (typeof section.content === 'string') {
			files.push(path.resolve(configDir, section.content));
		}
		if (section.sections) {
			files.push(...getAllContentFiles(section.sections, configDir));
		}
		return files;
	}, []);
}
