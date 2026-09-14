/**
 * The short label shown in the code area’s badge for a fence language: the well-known
 * spellings collapse to their usual abbreviation (`javascript` → “JS”), anything else is
 * shown uppercased as written.
 *
 * An example without a fence language (a bare ``` block, the most common case) is compiled
 * with the JSX and TypeScript transforms like every other playground example, so it is
 * labelled “JSX” rather than left blank.
 */
const LABELS: Record<string, string> = {
	javascript: 'JS',
	js: 'JS',
	jsx: 'JSX',
	typescript: 'TS',
	ts: 'TS',
	tsx: 'TSX',
};

export default function getLanguageLabel(lang?: string | null): string {
	if (!lang) {
		return 'JSX';
	}
	return LABELS[lang.toLowerCase()] ?? lang.toUpperCase();
}
