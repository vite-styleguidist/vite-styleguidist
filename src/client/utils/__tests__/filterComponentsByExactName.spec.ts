import deepfreeze from 'deepfreeze';
import filterComponentsByExactName from '../filterComponentsByExactName.js';

const components = deepfreeze([
	{
		name: 'Button',
	},
	{
		name: 'Image',
	},
]);

describe('filterComponentsByExactName', () => {
	it('should return components with exact name', () => {
		const result = filterComponentsByExactName(components, 'Image');
		expect(result.map((x) => x.name)).toEqual(['Image']);
	});

	// `lazyDocs` (ADR 0019): a component not loaded yet answers to the name its file gave it
	it('should return components with the exact name their file path gave them', () => {
		const lazy = deepfreeze([{ name: 'FancyButton', nameFromPath: 'Button' }]);
		expect(filterComponentsByExactName(lazy, 'Button').map((x) => x.name)).toEqual([
			'FancyButton',
		]);
		expect(filterComponentsByExactName(lazy, 'FancyButton').map((x) => x.name)).toEqual([
			'FancyButton',
		]);
		expect(filterComponentsByExactName(lazy, 'Image')).toEqual([]);
	});
});
