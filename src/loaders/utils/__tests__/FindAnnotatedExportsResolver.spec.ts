import fs from 'node:fs';
import path from 'node:path';
import { builtinResolvers, defaultHandlers, parse } from 'react-docgen';
import FindAnnotatedExportsResolver from '../FindAnnotatedExportsResolver.js';

const { ChainResolver, FindAnnotatedDefinitionsResolver, FindExportedDefinitionsResolver } =
	builtinResolvers;

// A styled-component (tagged template) marked with `@component`: react-docgen’s own
// resolvers only look at function and class definitions, so they can’t find it
const filename = path.resolve(
	import.meta.dirname,
	'../../../../test/components/Annotation/Annotation.js'
);
const code = fs.readFileSync(filename, 'utf8');

const parseWith = (resolver: ConstructorParameters<typeof ChainResolver>[0][number], src = code) =>
	parse(src, { resolver, handlers: defaultHandlers, filename });

it('should find an exported styled-component annotated with @component', () => {
	const docs = parseWith(new FindAnnotatedExportsResolver());

	expect(docs).toHaveLength(1);
	expect(docs[0].description).toContain('Styled-component test');
});

it('should find annotated named exports', () => {
	const docs = parseWith(
		new FindAnnotatedExportsResolver(),
		`import styled from 'styled-components';
/**
 * @component
 * The only true button
 */
export const Button = styled.button\`color: tomato;\`;
export const Ignored = styled.button\`color: snow;\`;
`
	);

	expect(docs).toHaveLength(1);
	expect(docs[0].description).toContain('The only true button');
});

it('should ignore exports without the annotation', () => {
	const fn = () =>
		parseWith(
			new FindAnnotatedExportsResolver(),
			`import styled from 'styled-components';
export default styled.div\`display: inline;\`;
`
		);

	expect(fn).toThrow('No suitable component definition found');
});

it('should support a custom annotation', () => {
	const docs = parseWith(
		new FindAnnotatedExportsResolver({ annotation: '@styleguide' }),
		`import styled from 'styled-components';
/** @styleguide */
export default styled.div\`display: inline;\`;
`
	);

	expect(docs).toHaveLength(1);
});

it('should be needed: react-docgen’s built-in resolvers do not find the annotated export', () => {
	const builtin = new ChainResolver(
		[new FindAnnotatedDefinitionsResolver(), new FindExportedDefinitionsResolver()],
		{ chainingLogic: ChainResolver.Logic.ALL }
	);

	expect(() => parseWith(builtin)).toThrow('No suitable component definition found');
});

it('should work in the default resolver chain without duplicating components', () => {
	// Same chain as the `resolver` default in src/scripts/schemas/config.ts
	const resolver = new ChainResolver(
		[
			new FindAnnotatedExportsResolver(),
			new FindAnnotatedDefinitionsResolver(),
			new FindExportedDefinitionsResolver(),
		],
		{ chainingLogic: ChainResolver.Logic.ALL }
	);

	expect(parseWith(resolver)).toHaveLength(1);
});
