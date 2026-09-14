import lowercaseKeys from 'lowercase-keys';
import { DOCS_DOCUMENTING } from '../../scripts/consts.js';
import type * as Rsg from '../../typings/index.js';

const hasStringModifiers = (modifiers: string): boolean => !!modifiers.match(/^[ \w]+$/);

export interface ExampleError {
	error: string;
}

export function isExampleError(example: unknown): example is ExampleError {
	return !!example && typeof example === 'object' && 'error' in example;
}

/**
 * Parse the modifiers of a fenced code block header (everything after the language):
 * either space-separated flags (`padded noeditor` → `{padded: true, noeditor: true}`)
 * or JSON (`{ "props": { "className": "checks" } }`).
 *
 * Shared by the Markdown pipeline (parseExample, below) and the MDX one
 * (src/loaders/utils/mdx.ts), so the two understand exactly the same fences and fail
 * with exactly the same message.
 */
export function parseModifiers(modifiers: string): Record<string, any> | ExampleError {
	if (hasStringModifiers(modifiers)) {
		return modifiers.split(' ').reduce((obj: Record<string, any>, modifier) => {
			obj[modifier] = true;
			return obj;
		}, {});
	}
	try {
		return JSON.parse(modifiers);
	} catch {
		return {
			error: `Cannot parse modifiers for "${modifiers}". Use space-separated strings or JSON:\n\n${DOCS_DOCUMENTING}`,
		};
	}
}

/**
 * Split fenced code block header to lang and modifiers, parse modifiers, lowercase modifier keys, etc.
 */
export default function parseExample(
	content: string,
	lang?: string | null,
	modifiers?: string,
	updateExample: (example: Omit<Rsg.CodeExample, 'type'>) => Omit<Rsg.CodeExample, 'type'> = (x) =>
		x
): Omit<Rsg.CodeExample, 'type'> | ExampleError {
	const example: Omit<Rsg.CodeExample, 'type'> = {
		content,
		lang,
	};

	if (modifiers) {
		const settings = parseModifiers(modifiers);
		if (isExampleError(settings)) {
			return settings;
		}
		example.settings = settings;
	}

	const updatedExample = updateExample(example);
	return {
		...updatedExample,
		settings: lowercaseKeys(updatedExample.settings || {}),
	};
}
