import fs from 'fs';
import path from 'path';
import castArray from 'lodash/castArray.js';
import isBoolean from 'lodash/isBoolean.js';
import isFunction from 'lodash/isFunction.js';
import isPlainObject from 'lodash/isPlainObject.js';
import isString from 'lodash/isString.js';
import isFinite from 'lodash/isFinite.js';
import map from 'lodash/map.js';
import listify from 'listify';
import kleur from 'kleur';
import typeDetect from 'type-detect';
import loggerMaker from 'glogg';
import { stringify } from 'q-i';
import StyleguidistError from './error.js';
import { ConfigSchemaOptions } from '../schemas/config.js';

const logger = loggerMaker('rsg');

const typeCheckers: Record<string, (untypedObject: unknown) => boolean> = {
	number: isFinite,
	string: isString,
	boolean: isBoolean,
	array: Array.isArray,
	function: isFunction,
	object: isPlainObject,
	// Instances of classes (e.g. react-docgen resolvers): any object but arrays and null
	'class instance': (value: unknown) =>
		typeof value === 'object' && value !== null && !Array.isArray(value),
	'file path': isString,
	'existing file path': isString,
	'directory path': isString,
	'existing directory path': isString,
};

const typesList = (types: string[]) => listify(types, { finalWord: 'or' });
const shouldBeFile = (types: string[]) => types.some((type) => type.includes('file'));
const shouldBeDirectory = (types: string[]) => types.some((type) => type.includes('directory'));
const shouldExist = (types: string[]) => types.some((type) => type.includes('existing'));

function isDirectory(pathString: string): boolean {
	try {
		return fs.lstatSync(pathString).isDirectory();
	} catch (e: any) {
		if (e.code !== 'ENOENT') {
			throw e;
		}
		return false;
	}
}

/** What is wrong with one config option. */
export type ConfigProblemKind =
	| 'unknown'
	| 'removed'
	| 'deprecated'
	| 'required'
	| 'type'
	| 'missing-file'
	| 'missing-directory'
	| 'invalid'
	| 'schema'
	| 'unexpected';

export interface ConfigProblem {
	kind: ConfigProblemKind;
	/** Config option the problem is about; undefined only for schema authoring mistakes */
	key?: string;
	/**
	 * Exactly the text this problem contributes to the error message. Kept verbatim so a
	 * config with a single problem produces the message it always has (see sanitizeConfig).
	 */
	message: string;
	/** Docs anchor hint, becomes `extra` of the thrown StyleguidistError */
	extra?: string;
	/** Closest known option name, for `unknown` problems */
	suggestion?: string;
	/**
	 * The value the user wrote, dumped for display, for `unknown` problems. Kept separately
	 * from `message` so a reader of the problem list does not have to parse the message back
	 * apart (see the doctor’s `checkConfig`).
	 */
	valuePreview?: string;
	/** The schema’s `removed`/`deprecated` text: what to use instead */
	replacement?: string;
	/** Errors fail the build, warnings only print */
	severity: 'error' | 'warning';
	/** The original exception, for problems raised by a `process` function */
	error?: unknown;
}

export interface CollectedConfig<T> {
	config: T;
	problems: ConfigProblem[];
}

/**
 * Damerau-Levenshtein distance (optimal string alignment): the number of insertions,
 * deletions, substitutions and transpositions of two adjacent characters that turn `a` into
 * `b`. Plain Levenshtein counts a transposition as two edits, so a swapped pair — the most
 * common typing mistake of all — used to score as far from the real option as a missing word.
 *
 * Written here rather than taken from a package: `fastest-levenshtein`, which this file used
 * to import, only does plain Levenshtein, and the strings compared are config option names —
 * never anything long enough for the speed of a hand-written matrix to matter. Nothing else
 * in the package imports `fastest-levenshtein` any more, so it can be dropped from the
 * dependencies the next time they are touched.
 */
export function editDistance(a: string, b: string): number {
	const rows: number[][] = [];
	for (let i = 0; i <= a.length; i++) {
		rows[i] = [i];
	}
	for (let j = 1; j <= b.length; j++) {
		rows[0][j] = j;
	}
	for (let i = 1; i <= a.length; i++) {
		for (let j = 1; j <= b.length; j++) {
			const substitution = a[i - 1] === b[j - 1] ? 0 : 1;
			rows[i][j] = Math.min(
				rows[i - 1][j] + 1, // deletion
				rows[i][j - 1] + 1, // insertion
				rows[i - 1][j - 1] + substitution
			);
			// Transposition of the two characters ending both prefixes ("ba" for "ab")
			if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
				rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + substitution);
			}
		}
	}
	return rows[a.length][b.length];
}

/**
 * The known option closest to what the user typed, or undefined when nothing is close enough.
 *
 * The tolerance scales with the length of the typed name: one edit is most of a short option
 * like `theme`, and almost nothing in `skipComponentsWithoutExample`. Names are compared
 * case-insensitively, so a casing mistake (`Components`) is reported as a typo of the real
 * option instead of as an option nobody has ever heard of.
 */
export function suggestOption(key: string, options: string[]): string | undefined {
	const threshold = Math.max(1, Math.min(3, Math.floor(key.length / 4)));
	let suggestion: string | undefined;
	let closest = Infinity;
	const lowerKey = key.toLowerCase();
	for (const option of options) {
		const steps = editDistance(lowerKey, option.toLowerCase());
		if (steps <= threshold && steps < closest) {
			suggestion = option;
			closest = steps;
		}
	}
	return suggestion;
}

/**
 * Format several problems as one message: a count, then the individual messages (unchanged,
 * they are the ones users have been reading for years) as a numbered list.
 */
export function formatConfigProblems(problems: ConfigProblem[]): string {
	const list = problems
		.map((problem, index) => `${index + 1}. ${problem.message.trim()}`)
		.join('\n\n');
	return `Found ${problems.length} problems:\n\n${list}`;
}

/**
 * Validate and normalize config, collecting *every* problem instead of stopping at the first
 * one. This is what `styleguidist doctor` runs on: a migration usually trips over several
 * options at once, and fixing them one error message per run is the slow way to do it.
 *
 * Never throws for a problem with the config itself (that is what the returned list is for);
 * it still throws whatever a schema `process` function throws when that is not a
 * StyleguidistError, because those are bugs, not user mistakes.
 */
export function collectConfigProblems<T extends Record<string, any>>(
	config: T,
	schema: Record<keyof T, ConfigSchemaOptions<T>>,
	rootDir: string
): CollectedConfig<T> {
	const problems: ConfigProblem[] = [];

	// Check for unknown fields
	map(config, (value, keyAny: keyof T) => {
		const key = keyAny as string;
		if (!schema[key]) {
			const suggestedOption = suggestOption(key, Object.keys(schema));
			const valuePreview = stringify(value);

			problems.push({
				kind: 'unknown',
				key,
				severity: 'error',
				suggestion: suggestedOption,
				valuePreview,
				extra: suggestedOption,
				message:
					`Unknown config option ${kleur.bold(key)} was found, the value is:\n` +
					valuePreview +
					(suggestedOption ? `\n\nDid you mean ${kleur.bold(suggestedOption)}?` : ''),
			});
		}
	});

	// Check all fields
	const safeConfig: Partial<T> = {};
	map(schema, (props, keyAny: keyof T) => {
		const key = keyAny as string;
		let value = config[key];

		// Custom processing
		if (props.process) {
			try {
				value = props.process(value, config, rootDir);
			} catch (exception) {
				// A `process` function reports an invalid *value* by throwing a StyleguidistError
				// (`colorScheme`, `scrollSync`, `template`, `editorConfig`). Anything else that
				// comes out of it is a bug in the schema, not something the user can fix, and is
				// kept as is so the caller can rethrow the original error with its stack.
				problems.push(
					exception instanceof StyleguidistError
						? {
								kind: 'invalid',
								key,
								severity: 'error',
								message: exception.message,
								extra: exception.extra,
								error: exception,
							}
						: {
								kind: 'unexpected',
								key,
								severity: 'error',
								message: `${kleur.bold(key)} config option could not be processed: ${
									exception instanceof Error ? exception.message : String(exception)
								}`,
								error: exception,
							}
				);
				// The value never went through the option’s own normalization, so every check
				// below would be about something the user did not write. Skip the option.
				safeConfig[keyAny] = config[key];
				return;
			}
		}

		if (value === undefined) {
			// Default value
			value = props.default;

			// Check if the field is required
			const isRequired = isFunction(props.required) ? props.required(config) : props.required;
			if (isRequired) {
				const message = isString(isRequired)
					? isRequired
					: `${kleur.bold(key)} config option is required.`;
				problems.push({ kind: 'required', key, severity: 'error', message, extra: key });
			}
		} else if (props.deprecated) {
			// Deprecated options still work, so this stays a warning that never fails a build
			logger.warn(`${key} config option is deprecated. ${props.deprecated}`);
			problems.push({
				kind: 'deprecated',
				key,
				severity: 'warning',
				replacement: props.deprecated,
				message: `${key} config option is deprecated. ${props.deprecated}`,
				extra: key,
			});
		} else if (props.removed) {
			problems.push({
				kind: 'removed',
				key,
				severity: 'error',
				replacement: props.removed,
				message: `${kleur.bold(key)} config option was removed. ${props.removed}`,
			});
		}

		if (value !== undefined && props.type) {
			const types = castArray(props.type);

			// Check type
			let schemaProblem = false;
			const hasRightType = types.some((type) => {
				if (!typeCheckers[type]) {
					problems.push({
						kind: 'schema',
						key,
						severity: 'error',
						message: `Wrong type ${kleur.bold(type)} specified for ${kleur.bold(key)} in schema.`,
					});
					schemaProblem = true;
					return false;
				}
				return typeCheckers[type](value);
			});
			if (!hasRightType && !schemaProblem) {
				const exampleValue = props.example || props.default;
				const example: Record<string, any> = {};
				if (exampleValue) {
					example[key] = exampleValue;
				}
				const exampleText = exampleValue
					? `
Example:

${stringify(example)}`
					: '';
				problems.push({
					kind: 'type',
					key,
					severity: 'error',
					extra: key,
					message: `${kleur.bold(key)} config option should be ${typesList(
						types
					)}, received ${typeDetect(value)}.\n${exampleText}`,
				});
			}

			// Absolutize paths
			if (isString(value) && (shouldBeFile(types) || shouldBeDirectory(types))) {
				value = path.resolve(rootDir, value);

				// Check for existence
				if (shouldExist(types)) {
					if (shouldBeFile(types) && !fs.existsSync(value)) {
						problems.push({
							kind: 'missing-file',
							key,
							severity: 'error',
							extra: key,
							message: `A file specified in ${kleur.bold(
								key
							)} config option does not exist:\n${value}`,
						});
					}
					if (shouldBeDirectory(types) && !isDirectory(value)) {
						problems.push({
							kind: 'missing-directory',
							key,
							severity: 'error',
							extra: key,
							message: `A directory specified in ${kleur.bold(
								key
							)} config option does not exist:\n${value}`,
						});
					}
				}
			}
		}

		safeConfig[keyAny] = value;
	});

	return { config: safeConfig as T, problems };
}

/**
 * The single error to throw for a list of collected problems, or undefined when the config is
 * fine. Warnings (deprecated options) never fail anything, so they are not part of it.
 *
 * Rethrows — rather than returns — the original exception of a `process` function that failed
 * with something other than a StyleguidistError, when that is the only problem: its stack
 * points at the bug and nothing here can improve on it.
 */
export function configProblemsToError(problems: ConfigProblem[]): StyleguidistError | undefined {
	const errors = problems.filter((problem) => problem.severity === 'error');
	if (errors.length === 0) {
		return undefined;
	}
	if (errors.length === 1) {
		const [error] = errors;
		if (error.kind === 'unexpected') {
			throw error.error;
		}
		return new StyleguidistError(error.message, error.extra);
	}
	return new StyleguidistError(formatConfigProblems(errors));
}

/**
 * Validates and normalizes config.
 *
 * Throws one StyleguidistError for everything that is wrong with the config: the same message
 * as ever when there is a single problem, a numbered list when there are several.
 *
 * @param {object} config
 * @param {object} schema
 * @param {string} rootDir
 * @return {object}
 */
export default function sanitizeConfig<T extends Record<string, any>>(
	config: T,
	schema: Record<keyof T, ConfigSchemaOptions<T>>,
	rootDir: string
): T {
	const { config: safeConfig, problems } = collectConfigProblems(config, schema, rootDir);

	const error = configProblemsToError(problems);
	if (error) {
		throw error;
	}

	return safeConfig;
}
