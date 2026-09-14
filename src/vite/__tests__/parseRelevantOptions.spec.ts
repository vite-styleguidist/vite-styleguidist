// @vitest-environment node
/**
 * The guard behind the persistent parse cache.
 *
 * The cache fingerprints an allow-list of config options (PARSE_RELEVANT_OPTIONS) rather
 * than the whole config, because hashing the whole config would throw the cache away
 * whenever an unrelated option changed — a different `serverPort`, a `build` after a
 * `server`. That is only safe while the list really does cover everything a parse reads.
 *
 * So this spec runs the three generators against a **proxied** config that records every
 * property anyone touched, and fails when a key outside the list shows up. A new option
 * read by a parse path therefore breaks this test rather than silently making the cache
 * able to serve a stale answer. The second direction is checked too: an option in the list
 * that no parse reads makes the cache throw itself away for nothing.
 */
import path from 'node:path';
import fs from 'node:fs';
import getConfig from '../../scripts/config.js';
import generatePropsModule from '../modules/props.js';
import generateExamplesModule from '../modules/examples.js';
import generateMdxModule from '../modules/mdx.js';
import { PARSE_RELEVANT_OPTIONS } from '../persistentCache.js';
import type * as Rsg from '../../typings/index.js';

const testDir = path.resolve(import.meta.dirname, '../../../test');
const component = (name: string) => path.join(testDir, 'components', name);
const MDX_FIXTURE = component('Button/Readme.mdx');

const cwd = process.cwd();
let config: Rsg.SanitizedStyleguidistConfig;

/**
 * A config that records the names of the options read through it.
 *
 * Only own string keys are recorded: `then` (awaiting a result), `Symbol.toStringTag` and
 * the like are asked for by the runtime, not by our code.
 */
function recordingConfig(base: Rsg.SanitizedStyleguidistConfig): {
	config: Rsg.SanitizedStyleguidistConfig;
	read: Set<string>;
} {
	const read = new Set<string>();
	const proxy = new Proxy(base, {
		get(target, property, receiver) {
			if (typeof property === 'string') {
				read.add(property);
			}
			return Reflect.get(target, property, receiver);
		},
	});
	return { config: proxy, read };
}

/** Every parse path, each returning the option names it touched. */
const scenarios: Record<string, () => Promise<Set<string>> | Set<string>> = {
	'component docs': () => {
		const file = component('Button/Button.js');
		const { config: proxy, read } = recordingConfig(config);
		generatePropsModule(proxy, file, fs.readFileSync(file, 'utf8'));
		return read;
	},
	// Placeholder.js carries an `@example ./examples.md` doclet, the branch of getProps()
	// that resolves a second examples file
	'component docs with an @example doclet': () => {
		const file = component('Placeholder/Placeholder.js');
		const { config: proxy, read } = recordingConfig(config);
		generatePropsModule(proxy, file, fs.readFileSync(file, 'utf8'));
		return read;
	},
	// A component with no examples file at all takes the `defaultExample` branch
	'component docs with the default example': () => {
		const file = component('Price/Price.js');
		const { config: proxy, read } = recordingConfig({
			...config,
			defaultExample: path.join(testDir, 'components', 'Button', 'Readme.md'),
		});
		generatePropsModule(proxy, file, fs.readFileSync(file, 'utf8'));
		return read;
	},
	'Markdown examples': () => {
		const file = component('Button/Readme.md');
		const { config: proxy, read } = recordingConfig(config);
		generateExamplesModule(
			proxy,
			{ file, displayName: 'Button', componentPath: component('Button/Button.js') },
			fs.readFileSync(file, 'utf8')
		);
		return read;
	},
	'MDX examples': async () => {
		const source = '# Hi\n\n```jsx\n<Button>OK</Button>\n```\n';
		fs.writeFileSync(MDX_FIXTURE, source);
		try {
			const { config: proxy, read } = recordingConfig(config);
			await generateMdxModule(
				proxy,
				{ file: MDX_FIXTURE, displayName: 'Button', componentPath: component('Button/Button.js') },
				source,
				{ isProduction: true }
			);
			return read;
		} finally {
			fs.rmSync(MDX_FIXTURE, { force: true });
		}
	},
};

const allowed = PARSE_RELEVANT_OPTIONS as readonly string[];
const everything = new Set<string>();

beforeAll(async () => {
	process.chdir(testDir);
	config = getConfig({ components: 'components/**/[A-Z]*.js' });
});
afterAll(() => {
	process.chdir(cwd);
	fs.rmSync(MDX_FIXTURE, { force: true });
});

describe('PARSE_RELEVANT_OPTIONS', () => {
	for (const [name, run] of Object.entries(scenarios)) {
		it(`should cover every option read while parsing ${name}`, async () => {
			const read = await run();
			read.forEach((key) => everything.add(key));
			expect([...read].filter((key) => !allowed.includes(key)).sort()).toEqual([]);
		});
	}

	it('should not list an option no parse reads', () => {
		expect([...allowed].filter((key) => !everything.has(key))).toEqual([]);
	});
});
