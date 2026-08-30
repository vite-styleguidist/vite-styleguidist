import path from 'node:path';

/**
 * Return the deepest directory that contains all given absolute file paths.
 * Used to pick a directory to watch for added/removed component files.
 */
export default function commonDir(files: string[]): string {
	if (files.length === 0) {
		return '';
	}
	const segments = files.map((file) => path.dirname(file).split(path.sep));
	const [first, ...rest] = segments;
	const common: string[] = [];
	for (let i = 0; i < first.length; i++) {
		if (rest.every((s) => s[i] === first[i])) {
			common.push(first[i]);
		} else {
			break;
		}
	}
	return common.join(path.sep) || path.sep;
}
