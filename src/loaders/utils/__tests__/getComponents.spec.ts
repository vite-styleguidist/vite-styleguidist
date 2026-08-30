import path from 'node:path';
import identity from 'lodash/identity.js';
import getComponents from '../getComponents.js';

it('getComponents() should return an object for components', () => {
	const result = getComponents(['Foo.js', 'Bar.js'], {
		configDir: path.resolve(import.meta.dirname, '../../../test'),
		getExampleFilename: identity,
		getComponentPathLine: identity,
	} as any);

	expect(result).toMatchSnapshot();
});
