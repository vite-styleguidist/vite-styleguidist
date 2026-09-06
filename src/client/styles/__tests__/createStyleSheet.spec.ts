import * as theme from '../theme.js';
import createStyleSheet from '../createStyleSheet.js';
import type * as Rsg from '../../../typings/index.js';

const customThemeColor = '#123456';
const customThemeBorderColor = '#654321';
const customThemeMaxWidth = 9999;

const customStyleBorderColor = '#ABCDEF';

const customThemeLinkColor = '#CCCAAA';

const testComponentName = 'TestComponentName';
const testRuleName = 'testRule';

const styles = ({ color, borderRadius, maxWidth }: Rsg.Theme) => ({
	[testRuleName]: {
		color: color.base,
		backgroundColor: color.baseBackground,
		borderColor: color.border,
		borderRadius,
		maxWidth,
	},
});

const config = {
	theme: {
		color: {
			base: customThemeColor,
			border: customThemeBorderColor,
			link: customThemeLinkColor,
		},
		maxWidth: customThemeMaxWidth,
	},
	styles: {
		[testComponentName]: {
			[testRuleName]: {
				borderColor: customStyleBorderColor,
			},
		},
	},
};

const configWithStylesAsAFunction = {
	...config,
	styles: (locTheme: Rsg.Theme) => {
		return {
			[testComponentName]: {
				[testRuleName]: {
					borderColor: locTheme.color.link,
				},
			},
		};
	},
};

describe('createStyleSheet', () => {
	it('should use theme variables', () => {
		const styleSheet = createStyleSheet(styles, config, testComponentName, '1');
		const style = (styleSheet.getRule(testRuleName) as any).style;

		expect(style['background-color']).toBe(theme.color.baseBackground);
		expect(style['border-radius']).toBe(`${theme.borderRadius}px`);
	});

	it('should override theme variables with config theme', () => {
		const styleSheet = createStyleSheet(styles, config, testComponentName, '2');
		const style = (styleSheet.getRule(testRuleName) as any).style;

		expect(style.color).toBe(customThemeColor);
		expect(style['max-width']).toBe(`${customThemeMaxWidth}px`);
	});

	it('should override config theme variables with config styles', () => {
		const styleSheet = createStyleSheet(styles, config, testComponentName, '3');
		const style = (styleSheet.getRule(testRuleName) as any).style;

		expect(style['border-color']).toBe(customStyleBorderColor);
	});

	it('should override config theme variables with config styles as a function', () => {
		const styleSheet = createStyleSheet(
			styles,
			configWithStylesAsAFunction,
			testComponentName,
			'4'
		);
		const style = (styleSheet.getRule(testRuleName) as any).style;

		expect(style['border-color']).toBe(customThemeLinkColor);
	});
});

describe('class names', () => {
	const stylesA = () => ({ root: { color: 'red' }, child: { color: 'blue' } });
	const stylesB = () => ({ root: { color: 'green' } });
	const emptyConfig = { theme: {}, styles: {} };

	it('should give every rule of a component the same suffix', () => {
		const { classes } = createStyleSheet(stylesA, emptyConfig, 'Alpha', '1');
		const suffix = classes.root.replace(/^rsg--root-/, '');
		expect(suffix).toMatch(/^\d+$/);
		expect(classes.child).toBe(`rsg--child-${suffix}`);
	});

	it('should generate the same class names regardless of creation order', () => {
		// Two independent factories: the memoize cache must not short-circuit this
		const stylesAgain = () => ({ root: { color: 'red' }, child: { color: 'blue' } });
		const first = createStyleSheet(stylesA, emptyConfig, 'Beta', '1').classes;
		createStyleSheet(stylesB, emptyConfig, 'Gamma', '1');
		createStyleSheet(stylesB, emptyConfig, 'Delta', '1');
		const second = createStyleSheet(stylesAgain, emptyConfig, 'Beta', '2').classes;
		expect(second).toEqual(first);
	});

	it('should detach the sheet of the previous revision of a component', () => {
		const first = createStyleSheet(stylesA, emptyConfig, 'Epsilon', '1');
		first.attach();
		expect(first.attached).toBe(true);
		const second = createStyleSheet(stylesA, emptyConfig, 'Epsilon', '2');
		expect(second).not.toBe(first);
		expect(first.attached).toBe(false);
		// Same class names across revisions, which is why the previous sheet had to go
		expect(second.classes).toEqual(first.classes);
	});
});
