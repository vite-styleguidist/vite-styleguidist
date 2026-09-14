import * as consts from '../consts.js';
import type { ConfigProblem } from '../utils/sanitizeConfig.js';
import { firstUrl, splitMessage, stripAnsi, truncate } from './text.js';
import type { DoctorFinding } from './types.js';

/**
 * Anchor of an option on the configuration page. The CLI has always built its “learn how to
 * configure your style guide” link this way (lowercased option name), and Docusaurus derives
 * the heading id of `## \`components\`` as `#components`, so the two agree.
 */
export function configDocs(key?: string): string {
	return consts.DOCS_CONFIG + (key ? `#${key.toLowerCase()}` : '');
}

/** First sentence (well: first line) of a schema `removed`/`deprecated` text. */
function firstLine(text: string): string {
	// The trailing colon introduced the URL on the next line, which is the `docs` field here
	return stripAnsi(text).split('\n')[0].trim().replace(/:$/, '');
}

/**
 * Turn everything the config validator collected into findings.
 *
 * The validator’s messages are reused verbatim (they are the ones the build prints, so a user
 * who has seen one recognises it here) — only reshaped: a one-line title, the rest as detail,
 * and the “what do I do now” part promoted to its own line.
 */
export default function checkConfig(problems: ConfigProblem[]): DoctorFinding[] {
	return problems.map((problem): DoctorFinding => {
		const { key, replacement } = problem;
		const { title, detail } = splitMessage(problem.message);
		const severity = problem.severity === 'warning' ? 'warning' : 'error';

		switch (problem.kind) {
			case 'unknown':
				return {
					id: 'config.unknown-option',
					level: 'error',
					title: `Unknown config option ${JSON.stringify(key)}`,
					// The value the user wrote, so they can find the option in a long config file
					detail: truncate(stripAnsi(problem.valuePreview || ''), 400) || undefined,
					fix: problem.suggestion
						? `Did you mean ${JSON.stringify(problem.suggestion)}?`
						: 'Remove it, or check the option list in the docs.',
					docs: configDocs(problem.suggestion),
					meta: { option: key, suggestion: problem.suggestion },
				};

			case 'removed':
				return {
					id: 'config.removed-option',
					level: 'error',
					title: `${key} config option was removed`,
					detail: replacement ? undefined : detail,
					fix: replacement ? firstLine(replacement) : undefined,
					// The schema points removed webpack options at the “Configuring Vite” page;
					// anything else falls back to its own section of the configuration page
					docs: (replacement && firstUrl(replacement)) || configDocs(key),
					meta: { option: key },
				};

			case 'deprecated':
				return {
					id: 'config.deprecated-option',
					level: 'warning',
					title: `${key} config option is deprecated`,
					fix: replacement ? firstLine(replacement) : undefined,
					docs: configDocs(key),
					meta: { option: key },
				};

			case 'required':
				return {
					id: 'config.required-option',
					level: 'error',
					title,
					detail,
					fix: `Add a ${JSON.stringify(key)} option to your style guide config.`,
					docs: configDocs(key),
					meta: { option: key },
				};

			case 'type':
				return {
					id: 'config.invalid-type',
					level: 'error',
					title,
					detail,
					fix: `Fix the value of the ${JSON.stringify(key)} option.`,
					docs: configDocs(key),
					meta: { option: key },
				};

			case 'missing-file':
			case 'missing-directory':
				return {
					id: problem.kind === 'missing-file' ? 'config.missing-file' : 'config.missing-directory',
					level: 'error',
					title,
					detail,
					file: detail,
					fix:
						problem.kind === 'missing-file'
							? `Create the file, or point ${JSON.stringify(key)} at an existing one.`
							: `Create the directory, or point ${JSON.stringify(key)} at an existing one.`,
					docs: configDocs(key),
					meta: { option: key },
				};

			case 'schema':
			case 'unexpected':
				// Not something a user config can cause: the schema itself is wrong, or an option’s
				// `process()` threw something that is not a validation error
				return {
					id: 'config.internal-error',
					level: 'error',
					title,
					detail,
					fix: 'This looks like a bug in Vite Styleguidist, please report it.',
					docs: consts.BUGS,
					meta: { option: key },
				};

			case 'invalid':
			default: {
				// An option that validates its own value (colorScheme, scrollSync, pageNav,
				// template, editorConfig): its message already says what the accepted values are.
				// `editorConfig` reports its removal from `process()` rather than through the
				// schema’s `removed` field, so match on the message to file it under the same id
				// — what the user has to do about it is “remove it”, not “fix the value”.
				const removed = / config option was removed/.test(title);
				return {
					id: removed ? 'config.removed-option' : 'config.invalid-option',
					level: severity,
					title,
					detail,
					fix: removed
						? `Remove the ${JSON.stringify(key)} option from your config.`
						: `Fix the value of the ${JSON.stringify(key)} option.`,
					docs: firstUrl(problem.message) || configDocs(key),
					meta: { option: key },
				};
			}
		}
	});
}
