// @vitest-environment node
// The `envPrefix` option: its schema entry lives in schemas/config.ts, the `define`
// entries it produces in make-vite-config.ts (getEnvDefine).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import getConfig from '../config.js';
import makeViteConfig, { getEnvDefine } from '../make-vite-config.js';
import type * as Rsg from '../../typings/index.js';

const testApp = (name: string) => path.resolve(import.meta.dirname, '../../../test/apps', name);

const cwd = process.cwd();
beforeEach(() => {
	process.chdir(testApp('defaults'));
});
afterEach(() => {
	process.chdir(cwd);
	vi.unstubAllEnvs();
});

/** A temporary folder holding `.env` files, so nothing is read from the repo itself. */
const createEnvDir = (files: Record<string, string>): string => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsg-env-prefix-'));
	Object.entries(files).forEach(([name, content]) => {
		fs.writeFileSync(path.join(dir, name), content);
	});
	return dir;
};

const withEnvDir = (files: Record<string, string>, run: (dir: string) => void) => {
	const dir = createEnvDir(files);
	try {
		run(dir);
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
};

describe('the option', () => {
	it('should be an empty list by default, so nothing is exposed', () => {
		expect(getConfig({})).toMatchObject({ envPrefix: [] });
	});

	it('should accept a list of prefixes', () => {
		expect(getConfig({ envPrefix: ['REACT_APP_', 'STORYBOOK_'] })).toMatchObject({
			envPrefix: ['REACT_APP_', 'STORYBOOK_'],
		});
	});

	it('should accept a single prefix as a string', () => {
		expect(getConfig({ envPrefix: 'REACT_APP_' })).toMatchObject({ envPrefix: ['REACT_APP_'] });
	});

	// An empty prefix matches every name, which would ship the whole environment of the
	// build machine in a public bundle. Vite refuses it in its own `envPrefix` too.
	it.each([[''], ['   ']])('should reject the empty prefix %j', (prefix) => {
		expect(() => getConfig({ envPrefix: prefix })).toThrow(
			'envPrefix config option must contain non-empty strings'
		);
	});

	it('should reject an empty prefix inside a list', () => {
		expect(() => getConfig({ envPrefix: ['REACT_APP_', ''] })).toThrow(
			'envPrefix config option must contain non-empty strings'
		);
	});

	it('should reject a value that is neither a string nor a list', () => {
		expect(() => getConfig({ envPrefix: 42 } as any)).toThrow(
			/envPrefix config option should be string or array, received number/
		);
	});
});

describe('getEnvDefine', () => {
	const configWith = (envPrefix?: string | string[]): Rsg.SanitizedStyleguidistConfig =>
		getConfig(envPrefix === undefined ? {} : { envPrefix });

	it('should define nothing when the option is not set', () => {
		vi.stubEnv('REACT_APP_TITLE', 'Pizza');
		expect(getEnvDefine(configWith(), 'production')).toEqual({});
	});

	it('should define the matching variables of the process environment', () => {
		vi.stubEnv('REACT_APP_TITLE', 'Pizza');
		vi.stubEnv('SECRET_TOKEN', 'do-not-ship-me');
		expect(getEnvDefine(configWith('REACT_APP_'), 'production')).toEqual({
			'process.env.REACT_APP_TITLE': '"Pizza"',
		});
	});

	it('should define the variables matching any of several prefixes', () => {
		vi.stubEnv('REACT_APP_TITLE', 'Pizza');
		vi.stubEnv('STORYBOOK_API', 'https://example.com');
		expect(getEnvDefine(configWith(['REACT_APP_', 'STORYBOOK_']), 'production')).toEqual({
			'process.env.REACT_APP_TITLE': '"Pizza"',
			'process.env.STORYBOOK_API': '"https://example.com"',
		});
	});

	it('should read the .env files of the project', () => {
		withEnvDir({ '.env': 'REACT_APP_TITLE=From dotenv\nSECRET=nope\n' }, (dir) => {
			expect(getEnvDefine(configWith('REACT_APP_'), 'development', dir)).toEqual({
				'process.env.REACT_APP_TITLE': '"From dotenv"',
			});
		});
	});

	// The mode is the Styleguidist environment, which is also the Vite mode, so
	// `.env.production` applies to a build and `.env.development` to the dev server.
	it('should read the .env file of the mode', () => {
		withEnvDir(
			{
				'.env': 'REACT_APP_TITLE=Everywhere\n',
				'.env.production': 'REACT_APP_TITLE=Built\n',
			},
			(dir) => {
				expect(getEnvDefine(configWith('REACT_APP_'), 'development', dir)).toEqual({
					'process.env.REACT_APP_TITLE': '"Everywhere"',
				});
				expect(getEnvDefine(configWith('REACT_APP_'), 'production', dir)).toEqual({
					'process.env.REACT_APP_TITLE': '"Built"',
				});
			}
		);
	});

	it('should let the process environment win over the .env files', () => {
		vi.stubEnv('REACT_APP_TITLE', 'From the shell');
		withEnvDir({ '.env': 'REACT_APP_TITLE=From dotenv\n' }, (dir) => {
			expect(getEnvDefine(configWith('REACT_APP_'), 'production', dir)).toEqual({
				'process.env.REACT_APP_TITLE': '"From the shell"',
			});
		});
	});

	// A prefix wide enough to match them would otherwise pin the values of the machine that
	// built the style guide into the bundle, or break React’s development/production switch.
	it('should never redefine NODE_ENV or STYLEGUIDIST_ENV', () => {
		vi.stubEnv('NODE_ENV', 'production');
		vi.stubEnv('STYLEGUIDIST_ENV', 'production');
		// A prefix wide enough to match the two of them also matches whatever else the shell
		// running the tests exports, so only the three names below are judged
		const define = getEnvDefine(configWith(['NODE_ENV', 'STYLEGUIDIST_ENV']), 'development');
		expect(define).not.toHaveProperty('process.env.NODE_ENV');
		expect(define).not.toHaveProperty('process.env.STYLEGUIDIST_ENV');
	});

	// `process.env.RSGTEST_//registry.npmjs.org/:_authToken` is not an expression (npm really
	// does export names like that), and a `define` key that isn’t one makes Vite fail on
	// every file it scans.
	it('should skip names that are not valid identifiers', () => {
		vi.stubEnv('RSGTEST_//registry.npmjs.org/:_authToken', 'secret');
		vi.stubEnv('RSGTEST_REGISTRY', 'https://registry.npmjs.org/');
		expect(getEnvDefine(configWith('RSGTEST_'), 'production')).toEqual({
			'process.env.RSGTEST_REGISTRY': '"https://registry.npmjs.org/"',
		});
	});
});

describe('the Vite config', () => {
	it('should carry the variables as define entries next to STYLEGUIDIST_ENV', async () => {
		vi.stubEnv('REACT_APP_TITLE', 'Pizza');
		const result = await makeViteConfig(getConfig({ envPrefix: ['REACT_APP_'] }), 'production');
		expect(result.define).toMatchObject({
			'process.env.REACT_APP_TITLE': '"Pizza"',
			'process.env.STYLEGUIDIST_ENV': '"production"',
		});
	});

	it('should define nothing extra by default', async () => {
		vi.stubEnv('REACT_APP_TITLE', 'Pizza');
		const result = await makeViteConfig(getConfig({}), 'production');
		expect(result.define).toEqual({ 'process.env.STYLEGUIDIST_ENV': '"production"' });
	});

	// Vite reads `.env` files from `envDir`, and a project that moved them says so in its
	// own Vite config; `envPrefix` has to look in the same folder.
	it('should read the .env files from viteConfig.envDir', async () => {
		const dir = createEnvDir({ '.env': 'REACT_APP_TITLE=From the env folder\n' });
		try {
			const result = await makeViteConfig(
				getConfig({ envPrefix: ['REACT_APP_'], viteConfig: { envDir: dir } }),
				'production'
			);
			expect(result.define).toMatchObject({
				'process.env.REACT_APP_TITLE': '"From the env folder"',
			});
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});
});
