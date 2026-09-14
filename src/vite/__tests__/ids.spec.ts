import path from 'node:path';
import {
	ENTRY_ID,
	STYLEGUIDE_ID,
	RESOLVED_ENTRY_ID,
	RESOLVED_STYLEGUIDE_ID,
	NULL,
	MARKER,
	PROPS_PREFIX,
	EXAMPLES_PREFIX,
	MDX_PREFIX,
	toPosix,
	propsId,
	examplesId,
	isPropsId,
	isExamplesId,
	isMdxId,
	parsePropsId,
	parseExamplesId,
	mdxId,
	parseMdxId,
} from '../ids.js';

describe('constants', () => {
	it('resolved ids should be the virtual ids with the null byte prefix', () => {
		expect(RESOLVED_ENTRY_ID).toBe(`\0${ENTRY_ID}`);
		expect(RESOLVED_STYLEGUIDE_ID).toBe(`\0${STYLEGUIDE_ID}`);
		expect(NULL).toBe('\0');
	});
});

describe('toPosix', () => {
	it('should convert the platform path separator to forward slashes', () => {
		expect(toPosix(['a', 'b', 'c.js'].join(path.sep))).toBe('a/b/c.js');
	});

	it('should leave posix paths untouched', () => {
		expect(toPosix('/a/b/c.js')).toBe('/a/b/c.js');
	});
});

describe('props ids', () => {
	it('should build an id from a component path', () => {
		expect(propsId('/components/Button.js')).toBe(
			`${PROPS_PREFIX}file=/components/Button.js&${MARKER}`
		);
	});

	it('should only recognize resolved (null-prefixed) ids', () => {
		const id = propsId('/components/Button.js');
		expect(isPropsId(id)).toBe(false);
		expect(isPropsId(NULL + id)).toBe(true);
		expect(isPropsId(NULL + examplesId({ file: '/x.md' }))).toBe(false);
	});

	it('should round-trip the component path', () => {
		const file = '/components/Button.js';
		expect(parsePropsId(NULL + propsId(file))).toBe(file);
	});
});

describe('examples ids', () => {
	it('should build an id from the Markdown file only', () => {
		expect(examplesId({ file: '/components/Readme.md' })).toBe(
			`${EXAMPLES_PREFIX}file=/components/Readme.md&${MARKER}`
		);
	});

	it('should encode the options as query parameters', () => {
		const id = examplesId({
			file: '/components/Readme.md',
			displayName: 'Button',
			componentPath: '/components/Button.js',
			shouldShowDefaultExample: true,
		});
		expect(id).toBe(
			`${EXAMPLES_PREFIX}file=/components/Readme.md&displayName=Button&component=/components/Button.js&default=1&${MARKER}`
		);
	});

	it('should only recognize resolved (null-prefixed) ids', () => {
		const id = examplesId({ file: '/components/Readme.md' });
		expect(isExamplesId(id)).toBe(false);
		expect(isExamplesId(NULL + id)).toBe(true);
		expect(isExamplesId(NULL + propsId('/components/Button.js'))).toBe(false);
	});

	it('should round-trip all options', () => {
		const options = {
			file: '/components/Readme.md',
			displayName: 'Button',
			componentPath: '/components/Button.js',
			shouldShowDefaultExample: true,
		};
		expect(parseExamplesId(NULL + examplesId(options))).toEqual(options);
	});

	it('should round-trip a file without options', () => {
		expect(parseExamplesId(NULL + examplesId({ file: '/components/Readme.md' }))).toEqual({
			file: '/components/Readme.md',
			displayName: undefined,
			componentPath: undefined,
			shouldShowDefaultExample: false,
		});
	});

	it('should keep special characters in paths intact', () => {
		const options = {
			file: '/my docs/Read me.md',
			displayName: 'Button',
			componentPath: '/my docs/Button&Co.js',
		};
		const id = examplesId(options);
		// The characters that would end the value (or the query) are escaped…
		expect(id).toContain('component=/my%20docs/Button%26Co.js');
		// …and only those: a path still reads as a path
		expect(id).toContain('file=/my%20docs/Read%20me.md');
		expect(parseExamplesId(NULL + id)).toMatchObject(options);
	});

	it('should round-trip a path with characters that are special in a query', () => {
		const options = {
			file: '/a b/#hash?q=1/+plus/100%/Read me.md',
			componentPath: '/a b/#hash?q=1/+plus/100%/Button.js',
		};
		expect(parseExamplesId(NULL + examplesId(options))).toMatchObject(options);
	});

	it('should keep a Windows drive letter readable and intact', () => {
		const options = { file: 'C:/docs/Read me.md', componentPath: 'C:/src/Button.tsx' };
		const id = examplesId(options);
		expect(id).toContain('file=C:/docs/');
		expect(parseExamplesId(NULL + id)).toMatchObject(options);
	});
});

describe('mdx ids', () => {
	const options = {
		file: ['', 'components', 'Button', 'Readme.mdx'].join(path.sep),
		displayName: 'Button',
		componentPath: ['', 'components', 'Button', 'Button.js'].join(path.sep),
		shouldShowDefaultExample: true,
	};

	it('should build an id with posix paths and the module options as query params', () => {
		expect(mdxId(options)).toBe(
			`${MDX_PREFIX}file=/components/Button/Readme.mdx&displayName=Button&component=/components/Button/Button.js&default=1&${MARKER}`
		);
	});

	it('should round-trip through parseMdxId', () => {
		expect(parseMdxId(NULL + mdxId(options))).toEqual({
			file: '/components/Button/Readme.mdx',
			displayName: 'Button',
			componentPath: '/components/Button/Button.js',
			shouldShowDefaultExample: true,
		});
	});

	it('should omit empty options', () => {
		const id = mdxId({ file: '/a/Readme.mdx' });
		expect(id).toBe(`${MDX_PREFIX}file=/a/Readme.mdx&${MARKER}`);
		expect(parseMdxId(NULL + id)).toEqual({
			file: '/a/Readme.mdx',
			displayName: undefined,
			componentPath: undefined,
			shouldShowDefaultExample: false,
		});
	});

	it('should recognize only resolved mdx ids', () => {
		expect(isMdxId(NULL + mdxId({ file: '/a/Readme.mdx' }))).toBe(true);
		expect(isMdxId(mdxId({ file: '/a/Readme.mdx' }))).toBe(false);
		expect(isMdxId(NULL + examplesId({ file: '/a/Readme.md' }))).toBe(false);
		expect(isExamplesId(NULL + mdxId({ file: '/a/Readme.mdx' }))).toBe(false);
		expect(isPropsId(NULL + mdxId({ file: '/a/Readme.mdx' }))).toBe(false);
	});
});

/**
 * The reason the ids have the shape they have (see the note in ../ids.ts): a plugin that
 * picks its modules with an extension filter must not pick ours. These are the filters we
 * measured a real project against — @rolldown/plugin-babel’s default `include`, and
 * @vitejs/plugin-react’s — plus the two shapes a filter can take: over the whole id, and
 * over the id with its query stripped.
 */
describe('id filters of other plugins', () => {
	/** @rolldown/plugin-babel’s default `include` (unanchored, hence the old problem). */
	const BABEL_INCLUDE = /\.(?:[jt]sx?|[cm][jt]s)(?:$|\?)/;
	/** @vitejs/plugin-react’s filter, and the shape most `transform` hooks are written with. */
	const REACT_INCLUDE = /\.[tj]sx?$/;
	/** An MDX plugin’s filter, over the id without its query — the other common shape. */
	const MDX_INCLUDE = /\.mdx?$/;

	const ids = [
		propsId('/components/Button.tsx'),
		propsId('/components/Button.js'),
		examplesId({ file: '/components/Readme.md', displayName: 'Button' }),
		examplesId({
			file: '/components/Readme.md',
			displayName: 'Button',
			componentPath: '/components/Button.tsx',
		}),
		examplesId({
			file: '/components/Readme.md',
			displayName: 'Button',
			componentPath: '/components/Button.tsx',
			shouldShowDefaultExample: true,
		}),
		mdxId({ file: '/components/Page.mdx', componentPath: '/components/Button.tsx' }),
	].flatMap((id) => [id, NULL + id]);

	it.each([
		['@rolldown/plugin-babel include', BABEL_INCLUDE],
		['@vitejs/plugin-react include', REACT_INCLUDE],
		['an .mdx include', MDX_INCLUDE],
	])('should not be matched by %s', (_name, filter) => {
		expect(ids.filter((id) => filter.test(id))).toEqual([]);
	});

	it('should not be matched with the query stripped either', () => {
		const cleaned = ids.map((id) => id.split('?')[0]);
		expect(cleaned.filter((id) => BABEL_INCLUDE.test(id) || MDX_INCLUDE.test(id))).toEqual([]);
		// Nothing that looks like a file name is left in front of the query at all
		expect(new Set(cleaned)).toEqual(
			new Set(
				[PROPS_PREFIX, EXAMPLES_PREFIX, MDX_PREFIX].flatMap((prefix) => {
					const head = prefix.slice(0, -1);
					return [head, NULL + head];
				})
			)
		);
	});
});
