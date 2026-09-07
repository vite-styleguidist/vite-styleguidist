// @vitest-environment node
import { scanGlobJsxInJs } from '../jsxInJs.js';

const plugin = scanGlobJsxInJs({ development: true });
const transform = (code: string, id: string) => plugin.transform(code, id);

const GLOB_COMPONENT = `
import React from 'react';
const icons = import.meta.glob('../icons/*.js');
export default function Gallery() {
	return <ul>{Object.keys(icons).map((key) => <li key={key}>{key}</li>)}</ul>;
}
`;

describe('scanGlobJsxInJs', () => {
	test('compiles the JSX of a .js file that uses import.meta.glob', async () => {
		const result = await transform(GLOB_COMPONENT, '/project/src/Gallery.js');
		expect(result).not.toBeNull();
		// The scanner parses the returned code as plain JavaScript, so no JSX may be left in it
		expect(result?.code).not.toMatch(/<li/);
		expect(result?.moduleType).toBe('js');
		// …and the glob itself must survive, it is what the scanner rewrites next
		expect(result?.code).toContain('import.meta.glob');
	});

	test('leaves a .js file without import.meta.glob to the scanner’s own module type', async () => {
		expect(await transform('export default () => <div />;', '/project/src/Button.js')).toBeNull();
	});

	test('leaves a file that only globs alone', async () => {
		expect(
			await transform("export default import.meta.glob('./*.js');", '/project/src/load.js')
		).toBeNull();
	});

	test('ignores files that are not .js', async () => {
		expect(await transform(GLOB_COMPONENT, '/project/src/Gallery.jsx')).toBeNull();
		expect(await transform(GLOB_COMPONENT, '/project/src/Gallery.tsx')).toBeNull();
	});

	test('ignores dependencies, which Vite pre-bundles on its own', async () => {
		expect(await transform(GLOB_COMPONENT, '/project/node_modules/ui/Gallery.js')).toBeNull();
	});

	test('leaves a file that only looks like JSX alone', async () => {
		// `a < b` trips the cheap pre-check and then fails to parse as JSX: not our file
		const code = "const smaller = a < b && c > d;\nimport.meta.glob('./*.js');";
		expect(await transform(code, '/project/src/compare.js')).toBeNull();
	});
});
