import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { NULL } from './ids.js';

const isFile = (filepath: string): boolean => {
	try {
		return fs.statSync(filepath).isFile();
	} catch {
		return false;
	}
};

/**
 * Styleguidist’s virtual modules import user files by absolute file system path.
 * Vite resolves a leading `/` as root-relative first and only then as an fs path,
 * so a project containing a directory mirroring the absolute path (e.g.
 * `<root>/Users/...`) could shadow the real file. This `pre` plugin pins absolute
 * paths of existing files coming from our virtual modules to the real files.
 *
 * Directories and extensionless paths (`import Button from '../Button'` in an
 * example) are left to Vite’s resolver, which tries extensions and index files.
 */
export default function absolutePaths(): Plugin {
	return {
		name: 'rsg:absolute-paths',
		enforce: 'pre',
		resolveId(id, importer) {
			if (
				importer &&
				importer.startsWith(NULL) &&
				path.isAbsolute(id) &&
				!id.includes('?') &&
				isFile(id)
			) {
				return id;
			}
			return null;
		},
	};
}
