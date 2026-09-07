// Small text helpers shared by the doctor checks. The doctor reuses the messages the config
// validator has always produced, and those are written for a terminal: coloured, and with the
// details on the lines below the statement. A report needs them plain and split in two.

// Built from a char code so no escape character ends up in this file
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

/**
 * Remove terminal colours. Needed even when kleur is off, because `q-i`’s `stringify` (the
 * value dump in the “unknown config option” message) colours its output on its own.
 */
export function stripAnsi(text: string): string {
	return text.replace(ANSI, '');
}

/**
 * Split a validation message into a one-line title and the rest.
 *
 * The trailing colon of a message that introduces its detail (“…does not exist:”) is dropped:
 * in the report the detail is a separate, indented line, so the colon would dangle.
 */
export function splitMessage(message: string): { title: string; detail?: string } {
	const lines = stripAnsi(message).split('\n');
	const title = (lines.shift() || '').trim().replace(/:$/, '');
	const detail = lines.join('\n').trim();
	return { title, detail: detail || undefined };
}

/** First URL in a text, used to turn a “use X instead: <link>” message into a docs pointer. */
export function firstUrl(text: string): string | undefined {
	const match = /https?:\/\/\S+/.exec(text);
	return match ? match[0] : undefined;
}

/** `a`, `b`, `c`, capped so a check never prints a hundred names. */
export function listNames(names: string[], max = 10): string {
	const shown = names.slice(0, max).join(', ');
	return names.length > max ? `${shown} and ${names.length - max} more` : shown;
}

/** Cap a detail so one enormous config value cannot push the rest of the report off screen. */
export function truncate(text: string | undefined, max: number): string | undefined {
	if (text === undefined) {
		return undefined;
	}
	return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** `1 file` / `2 files`, for check titles that count things. */
export function plural(count: number, noun: string, pluralNoun = `${noun}s`): string {
	return `${count} ${count === 1 ? noun : pluralNoun}`;
}
