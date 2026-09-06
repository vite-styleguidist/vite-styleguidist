import path from 'node:path';
import {
	ENTRY_ID,
	STYLEGUIDE_ID,
	RESOLVED_ENTRY_ID,
	RESOLVED_STYLEGUIDE_ID,
	NULL,
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
		expect(propsId('/components/Button.js')).toBe(`${PROPS_PREFIX}/components/Button.js`);
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
			`${EXAMPLES_PREFIX}/components/Readme.md`
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
			`${EXAMPLES_PREFIX}/components/Readme.md?displayName=Button&component=%2Fcomponents%2FButton.js&default=1`
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
		expect(parseExamplesId(NULL + examplesId(options))).toMatchObject(options);
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
			`${MDX_PREFIX}/components/Button/Readme.mdx?displayName=Button&component=%2Fcomponents%2FButton%2FButton.js&default=1`
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
		expect(id).toBe(`${MDX_PREFIX}/a/Readme.mdx`);
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
		expect(isMdxId(NULL + EXAMPLES_PREFIX + '/a/Readme.md')).toBe(false);
		expect(isExamplesId(NULL + mdxId({ file: '/a/Readme.mdx' }))).toBe(false);
		expect(isPropsId(NULL + mdxId({ file: '/a/Readme.mdx' }))).toBe(false);
	});
});
