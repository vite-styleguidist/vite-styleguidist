// @vitest-environment node
/**
 * What a component’s documentation is parsed *from*, beyond the component’s own file.
 *
 * Both parsers Styleguidist supports read across files — react-docgen follows a
 * component’s imports (`Button.propTypes = buttonProps` in a sibling module, an interface
 * a `.tsx` component’s props extend), and a `propsParser` of your own resolves types
 * through the whole TypeScript program. A cache keyed on the component’s own bytes alone
 * therefore answered with documentation of a file that had changed, for ever: see
 * PropsModule.dependencies, ../persistentCache.ts (rule 1) and the `cache` option.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import getConfig from '../../scripts/config.js';
import generatePropsModule, { clearImportedFilesCache } from '../modules/props.js';
import { createPersistentCache, clearFileHashCache } from '../persistentCache.js';
import type { DocsKeyParts } from '../persistentCache.js';
import type * as Rsg from '../../typings/index.js';

const cwd = process.cwd();
let dir: string;

beforeEach(() => {
	// realpath: on macOS the temporary folder is reached through a symlink, and react-docgen
	// resolves imports to the real path — the two would never compare equal
	dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'rsg-deps-')));
	fs.mkdirSync(path.join(dir, 'components'), { recursive: true });
	clearImportedFilesCache();
	clearFileHashCache();
});

afterEach(() => {
	process.chdir(cwd);
	fs.rmSync(dir, { recursive: true, force: true });
});

const write = (name: string, content: string) => {
	const file = path.join(dir, 'components', name);
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, content);
	return file;
};

const configFor = (overrides: Partial<Rsg.StyleguidistConfig> = {}) => {
	process.chdir(dir);
	return getConfig({ components: 'components/**/[A-Z]*.{js,tsx}', ...overrides });
};

const parse = (config: Rsg.SanitizedStyleguidistConfig, file: string) =>
	generatePropsModule(config, file, fs.readFileSync(file, 'utf8'));

const propNames = (docs: Rsg.PropsObject) =>
	((docs.props || []) as Rsg.PropDescriptor[]).map((prop) => prop.name);

describe('the default parser', () => {
	it('should report the module a component’s propTypes were imported from', () => {
		const props = write(
			'Button/buttonProps.js',
			`import PropTypes from 'prop-types';
export default { color: PropTypes.string };
`
		);
		const button = write(
			'Button/Button.js',
			`import React from 'react';
import buttonProps from './buttonProps.js';
const Button = (props) => <button>{props.children}</button>;
Button.propTypes = buttonProps;
export default Button;
`
		);

		const { docs, dependencies } = parse(configFor(), button);

		// react-docgen really did follow the import…
		expect(propNames(docs)).toContain('color');
		// …and said so
		expect(dependencies).toEqual([props]);
	});

	it('should report the module a TypeScript component’s props interface lives in', () => {
		const types = write(
			'Card/types.ts',
			`export interface CardProps {
	/** The title of the card */
	title: string;
}
`
		);
		const card = write(
			'Card/Card.tsx',
			`import React from 'react';
import type { CardProps } from './types';
export default function Card({ title }: CardProps) {
	return <div>{title}</div>;
}
`
		);

		const { docs, dependencies } = parse(configFor(), card);

		expect(propNames(docs)).toContain('title');
		expect(dependencies).toEqual([types]);
	});

	it('should not report the component itself, or a package', () => {
		const button = write(
			'Plain/Plain.js',
			`import React from 'react';
import PropTypes from 'prop-types';
const Plain = () => <b />;
Plain.propTypes = { a: PropTypes.string };
export default Plain;
`
		);

		expect(parse(configFor(), button).dependencies).toEqual([]);
	});

	// The importer keeps every file it has followed parsed in memory, and react-docgen’s own
	// default importer never lets go of it — which is what made an edited props module
	// invisible to a running dev server even with the cache off.
	it('should re-read an imported file after clearImportedFilesCache()', () => {
		write('Sticky/props.js', `export default { color: { type: 'string' } };`);
		const component = write(
			'Sticky/Sticky.js',
			`import React from 'react';
import props from './props.js';
const Sticky = () => <b />;
Sticky.propTypes = props;
export default Sticky;
`
		);
		const config = configFor();
		expect(propNames(parse(config, component).docs)).toEqual(['color']);

		write('Sticky/props.js', `export default { tone: { type: 'string' } };`);
		clearImportedFilesCache();

		expect(propNames(parse(config, component).docs)).toEqual(['tone']);
	});
});

describe('a propsParser of your own', () => {
	// Such a parser cannot be asked what it read (the parser people reach for resolves types
	// through a TypeScript program built once at module scope), so the component’s own
	// relative imports stand in for it — type-only imports very much included
	it('should report the files the component imports, transitively', () => {
		const tone = write('Alert/tone.ts', `export type Tone = 'info' | 'warn';`);
		const types = write(
			'Alert/types.ts',
			`import type { Tone } from './tone';
export interface AlertProps { tone: Tone }
`
		);
		const alert = write(
			'Alert/Alert.tsx',
			`import React from 'react';
import type { AlertProps } from './types';
export default function Alert({ tone }: AlertProps) {
	return <div>{tone}</div>;
}
`
		);
		const parser = path.join(dir, 'parser.cjs');
		fs.writeFileSync(
			parser,
			`module.exports = function propsParser(filePath, source, resolver, handlers) {
	return require('react-docgen').parse(source, { resolver, handlers, filename: filePath });
};
`
		);

		const { dependencies } = parse(configFor({ propsParser: parser }), alert);

		expect(dependencies.sort()).toEqual([tone, types].sort());
	});
});

describe('the persistent cache', () => {
	const key = (file: string): DocsKeyParts => ({
		file,
		source: fs.readFileSync(file, 'utf8'),
		examplesFile: false,
		examplesFileExists: false,
	});

	it('should stop serving an entry when a file its parse read has changed', () => {
		const props = write('Keyed/props.js', `export default { color: { type: 'string' } };`);
		const component = write(
			'Keyed/Keyed.js',
			`import React from 'react';
import props from './props.js';
const Keyed = () => <b />;
Keyed.propTypes = props;
export default Keyed;
`
		);
		const config = configFor();
		const cacheDir = path.join(dir, '.vite');

		const first = createPersistentCache(config, cacheDir);
		const parsed = parse(config, component);
		first.setDocs(key(component), {
			docs: parsed.docs,
			code: parsed.code,
			dependencies: parsed.dependencies,
			exampleFile: null,
			exampleFileExists: false,
		});
		first.flush();

		// Nothing changed: the next run is served from the cache
		const warm = createPersistentCache(config, cacheDir);
		expect(warm.getDocs(key(component))?.code).toBe(parsed.code);

		// The component is untouched, so its own key is unchanged — only the file it imports
		// has been rewritten
		fs.writeFileSync(props, `export default { tone: { type: 'string' } };`);
		clearFileHashCache();
		const after = createPersistentCache(config, cacheDir);
		expect(after.getDocs(key(component))).toBeUndefined();
		expect(after.misses.docs).toBe(1);
	});

	it('should stop serving an entry when a file its parse read is gone', () => {
		const props = write('Gone/props.js', `export default { color: { type: 'string' } };`);
		const component = write(
			'Gone/Gone.js',
			`import React from 'react';
import props from './props.js';
const Gone = () => <b />;
Gone.propTypes = props;
export default Gone;
`
		);
		const config = configFor();
		const cacheDir = path.join(dir, '.vite');

		const first = createPersistentCache(config, cacheDir);
		const parsed = parse(config, component);
		first.setDocs(key(component), {
			docs: parsed.docs,
			code: parsed.code,
			dependencies: parsed.dependencies,
			exampleFile: null,
			exampleFileExists: false,
		});
		first.flush();

		fs.rmSync(props);
		clearFileHashCache();
		expect(createPersistentCache(config, cacheDir).getDocs(key(component))).toBeUndefined();
	});
});
