// @vitest-environment node
import checkConfig from '../checkConfig.js';
import type { ConfigProblem } from '../../utils/sanitizeConfig.js';

const problem = (overrides: Partial<ConfigProblem>): ConfigProblem => ({
	kind: 'unknown',
	severity: 'error',
	message: 'Something is wrong',
	...overrides,
});

it('should turn an unknown option into an error with the suggestion as the fix', () => {
	const [finding] = checkConfig([
		problem({
			kind: 'unknown',
			key: 'styleguidComponents',
			suggestion: 'styleguideComponents',
			valuePreview: "{ Wrapper: 'x' }",
			message: 'Unknown config option styleguidComponents was found, the value is:\n…',
		}),
	]);
	expect(finding).toMatchObject({
		id: 'config.unknown-option',
		level: 'error',
		title: 'Unknown config option "styleguidComponents"',
		detail: "{ Wrapper: 'x' }",
		fix: 'Did you mean "styleguideComponents"?',
		docs: expect.stringContaining('#styleguidecomponents'),
	});
});

it('should tell to remove an unknown option nothing looks like', () => {
	const [finding] = checkConfig([problem({ kind: 'unknown', key: 'pizza' })]);
	expect(finding.fix).toBe('Remove it, or check the option list in the docs.');
	expect(finding.docs).not.toMatch('#');
});

it('should point a removed option at its replacement and at the docs of the message', () => {
	const [finding] = checkConfig([
		problem({
			kind: 'removed',
			key: 'webpackConfig',
			replacement:
				'Styleguidist now uses Vite instead of webpack. Use the "viteConfig" option instead:\nhttps://example.com/docs/vite/',
			message: 'webpackConfig config option was removed. …',
		}),
	]);
	expect(finding).toMatchObject({
		id: 'config.removed-option',
		level: 'error',
		title: 'webpackConfig config option was removed',
		fix: 'Styleguidist now uses Vite instead of webpack. Use the "viteConfig" option instead',
		docs: 'https://example.com/docs/vite/',
	});
});

it('should keep a deprecated option a warning', () => {
	const [finding] = checkConfig([
		problem({
			kind: 'deprecated',
			key: 'showCode',
			severity: 'warning',
			replacement: 'Use exampleMode option instead',
			message: 'showCode config option is deprecated. Use exampleMode option instead',
		}),
	]);
	expect(finding).toMatchObject({
		id: 'config.deprecated-option',
		level: 'warning',
		title: 'showCode config option is deprecated',
		fix: 'Use exampleMode option instead',
	});
});

it('should keep the validator message as the title of a type problem', () => {
	const [finding] = checkConfig([
		problem({
			kind: 'type',
			key: 'serverPort',
			message: 'serverPort config option should be number, received string.\nExample:\n\n42',
		}),
	]);
	expect(finding).toMatchObject({
		id: 'config.invalid-type',
		title: 'serverPort config option should be number, received string.',
		detail: 'Example:\n\n42',
	});
});

it('should carry the missing path of a file problem as the file of the finding', () => {
	const [finding] = checkConfig([
		problem({
			kind: 'missing-file',
			key: 'defaultExample',
			message: 'A file specified in defaultExample config option does not exist:\n/nope.md',
		}),
	]);
	expect(finding).toMatchObject({
		id: 'config.missing-file',
		title: 'A file specified in defaultExample config option does not exist',
		file: '/nope.md',
		fix: 'Create the file, or point "defaultExample" at an existing one.',
	});
});

// `editorConfig` reports its own removal from `process()`, so it arrives as an `invalid`
it('should file an option that reports its own removal under the removed id', () => {
	const [finding] = checkConfig([
		problem({
			kind: 'invalid',
			key: 'editorConfig',
			message: 'editorConfig config option was removed. Use “theme” option instead.',
		}),
	]);
	expect(finding).toMatchObject({
		id: 'config.removed-option',
		fix: 'Remove the "editorConfig" option from your config.',
	});
});

it('should file a value an option rejects itself under the invalid id', () => {
	const [finding] = checkConfig([
		problem({
			kind: 'invalid',
			key: 'scrollSync',
			message: 'scrollSync config option must be one of false, "selection", "hash", got true.',
		}),
	]);
	expect(finding).toMatchObject({
		id: 'config.invalid-option',
		fix: 'Fix the value of the "scrollSync" option.',
		docs: expect.stringContaining('#scrollsync'),
	});
});

it('should ask for a bug report when the schema itself is wrong', () => {
	const [finding] = checkConfig([
		problem({
			kind: 'schema',
			key: 'food',
			message: 'Wrong type pizza specified for food in schema.',
		}),
	]);
	expect(finding).toMatchObject({
		id: 'config.internal-error',
		docs: expect.stringContaining('/issues'),
	});
});
