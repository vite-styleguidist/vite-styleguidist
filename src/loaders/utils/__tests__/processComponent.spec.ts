import path from 'node:path';
import processComponent from '../processComponent.js';
import importIt, { importDefault } from '../importIt.js';
import { propsId } from '../../../vite/ids.js';

const config = {
	configDir: import.meta.dirname,
	getExampleFilename: (componentpath: string) =>
		path.join(path.dirname(componentpath), 'Readme.md'),
	getComponentPathLine: (componentpath: string) => componentpath,
};

it('processComponent() should return an object for section with content', () => {
	const result = processComponent('pizza.js', config as any);

	expect(result).toMatchSnapshot();
});

it('processComponent() should reference the component module and its props module', () => {
	const result = processComponent('pizza.js', config as any);

	// The component itself is imported as a namespace, the generated props module by its default export
	expect(result.module).toEqual(importIt('pizza.js'));
	expect(result.props).toEqual(importDefault(propsId('pizza.js')));
	expect(result.props).toEqual({ __rsgImport: 'virtual:rsg-props?file=pizza.js&rsg', __rsgDefault: true });
});

it('processComponent() should import the metadata file when it exists', () => {
	const file = path.resolve(
		import.meta.dirname,
		'../../../../test/components/Placeholder/Placeholder.js'
	);
	const result = processComponent(file, config as any);

	expect(result.metadata).toEqual(importDefault(file.replace(/\.js$/, '.json')));
	expect(processComponent('pizza.js', config as any).metadata).toEqual({});
});
