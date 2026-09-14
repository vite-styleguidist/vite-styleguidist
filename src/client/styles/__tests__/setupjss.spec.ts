import jssBase from 'jss';
import jss, { hashString, getSheetSuffix, createSheetGenerateId } from '../setupjss.js';

describe('setupjss', () => {
	it('should renerate prefixed class names', () => {
		const { classes } = jss.createStyleSheet({
			root: {},
		});
		expect(classes.root).toMatch(/^rsg--\w+-\d+$/);
	});

	it('jss-global plugin should be enabled', () => {
		const css = jss
			.createStyleSheet({
				'@global body': {
					color: 'red',
				},
			})
			.toString();
		expect(css).toMatch(/^body {/);
	});

	it('jss plugins should be enabled', () => {
		const stylesheet = jss.createStyleSheet({
			root: {
				backgroundColor: 'tomato',
				width: 1,
				'&:hover': {
					color: 'snow',
				},
			},
			child: {
				composes: '$root',
				color: 'blue',
			},
		});

		const root = (stylesheet.getRule('root') as any).style;
		expect(root).toEqual(expect.any(Object));
		expect(root['background-color']).toBe('tomato');
		expect(root.width).toBe('1px');
		expect(stylesheet.classes.root).toMatch(/^rsg--root-\d+$/);

		const child = (stylesheet.getRule('child') as any).style;
		expect(child).toEqual(expect.any(Object));
		expect(child.color).toBe('blue');
		expect(stylesheet.classes.child).toMatch(/^rsg--child-\d+ rsg--root-\d+$/);

		// Anonymous sheets are numbered by a counter, so derive the selector from the
		// generated class instead of hard-coding the number
		const hover = (stylesheet as any).rules.map[`.${stylesheet.classes.root}:hover`];
		expect(hover).toEqual(expect.any(Object));
		expect(hover.style.color).toBe('snow');
	});

	it('base jss instance setup shoud not affect Styleguidist styles', () => {
		jssBase.setup();

		const stylesheet = jss.createStyleSheet({
			root: {
				width: 1,
			},
		});

		expect(stylesheet.classes.root).toMatch(/^rsg--root-\d+$/);

		const root = (stylesheet.getRule('root') as any).style;
		expect(root.width).toBe('1px');
	});
});

describe('deterministic class names', () => {
	it('hashString is stable and returns an unsigned 32-bit integer', () => {
		expect(hashString('Logo(logo)')).toBe(hashString('Logo(logo)'));
		expect(hashString('Logo(logo)')).not.toBe(hashString('Logo(logo,version)'));
		expect(hashString('')).toBe(0x811c9dc5);
		expect(hashString('Logo(logo)')).toBeGreaterThanOrEqual(0);
		expect(hashString('Logo(logo)')).toBeLessThanOrEqual(0xffffffff);
	});

	it('getSheetSuffix returns the same suffix for the same identity', () => {
		expect(getSheetSuffix('Foo(a,b)')).toBe(getSheetSuffix('Foo(a,b)'));
		expect(getSheetSuffix('Foo(a,b)')).toBe(hashString('Foo(a,b)'));
	});

	it('createSheetGenerateId gives every rule of a sheet the same suffix', () => {
		const suffix = getSheetSuffix('Foo(child,root)');
		const stylesheet = jss.createStyleSheet(
			{
				root: { width: 1 },
				child: { composes: '$root', color: 'blue' },
				'&:hover': { color: 'red' },
			},
			{ generateId: createSheetGenerateId(suffix) }
		);
		expect(stylesheet.classes.root).toBe(`rsg--root-${suffix}`);
		expect(stylesheet.classes.child).toBe(`rsg--child-${suffix} rsg--root-${suffix}`);
	});

	it('class names do not depend on how many sheets were created before', () => {
		const suffix = getSheetSuffix('Bar(root)');
		const first = jss.createStyleSheet({ root: {} }, { generateId: createSheetGenerateId(suffix) });
		jss.createStyleSheet({ root: {}, other: {} });
		jss.createStyleSheet({ root: {} });
		const second = jss.createStyleSheet(
			{ root: {} },
			{ generateId: createSheetGenerateId(suffix) }
		);
		expect(second.classes.root).toBe(first.classes.root);
	});
});
