import importIt, { importDefault } from '../importIt.js';
import { isImportMarker } from '../../../typings/index.js';

describe('importIt', () => {
	it('should return a marker importing the module namespace', () => {
		expect(importIt('/abs/path/Button.js')).toEqual({ __rsgImport: '/abs/path/Button.js' });
	});

	it('should accept bare specifiers and virtual module ids', () => {
		expect(importIt('react')).toEqual({ __rsgImport: 'react' });
		expect(importIt('virtual:rsg-styleguide')).toEqual({ __rsgImport: 'virtual:rsg-styleguide' });
	});

	it('should be recognised by isImportMarker()', () => {
		expect(isImportMarker(importIt('react'))).toBe(true);
		expect(isImportMarker(importDefault('react'))).toBe(true);
		// The webpack-era `{ require }` shape must not be mistaken for a marker
		expect(isImportMarker({ require: 'react' })).toBe(false);
		expect(isImportMarker('react')).toBe(false);
		expect(isImportMarker(null)).toBe(false);
	});
});

describe('importDefault', () => {
	it('should return a marker importing the default export', () => {
		expect(importDefault('virtual:rsg-props?file=/abs/path/Button.js&rsg')).toEqual({
			__rsgImport: 'virtual:rsg-props?file=/abs/path/Button.js&rsg',
			__rsgDefault: true,
		});
	});
});
