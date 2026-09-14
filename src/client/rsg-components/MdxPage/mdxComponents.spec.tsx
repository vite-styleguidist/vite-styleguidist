import React from 'react';
import { render } from '@testing-library/react';
import markdownRenderers from '../Markdown/markdownRenderers.js';
import { defaultMdxComponents, getMdxComponents } from './mdxComponents.js';
import Context from '../Context/index.js';
import { DisplayModes } from '../../consts.js';

const Provider = (props: any) => (
	<Context.Provider
		value={{ config: {}, codeRevision: 1, displayMode: DisplayModes.all, slots: {} } as any}
		{...props}
	/>
);

describe('mdxComponents', () => {
	it('should map every element the Markdown renderers cover, plus the two loader components', () => {
		const expected = [...Object.keys(markdownRenderers), 'RsgPlayground', 'RsgStatic'].sort();

		expect(Object.keys(defaultMdxComponents).sort()).toEqual(expected);
	});

	it('should bind the props an element’s renderer takes for granted', () => {
		// `h3` is MarkdownHeading with `level: 3`; MDX passes plain children, not the level
		const H3 = defaultMdxComponents.h3;
		const { getByRole } = render(
			<Provider>
				<H3>Heading</H3>
			</Provider>
		);

		expect(getByRole('heading', { level: 3 })).toHaveTextContent('Heading');
	});

	it('should let the document pass its own props through', () => {
		const A = defaultMdxComponents.a;
		const { getByRole } = render(
			<Provider>
				<A href="/test">Link</A>
			</Provider>
		);

		expect(getByRole('link')).toHaveAttribute('href', '/test');
	});

	it('should return the shared map untouched when nothing is configured', () => {
		// Same object, not a copy: a new map on every render would remount the whole page
		expect(getMdxComponents()).toBe(defaultMdxComponents);
		expect(getMdxComponents(undefined)).toBe(defaultMdxComponents);
	});

	it('should merge the configured components over the defaults', () => {
		const Callout = () => <aside />;
		const Para = () => <p />;
		const merged = getMdxComponents({ Callout, p: Para });

		expect(merged.Callout).toBe(Callout);
		expect(merged.p).toBe(Para);
		expect(merged.h1).toBe(defaultMdxComponents.h1);
		// The defaults are not mutated by a merge
		expect(defaultMdxComponents.p).not.toBe(Para);
		expect(defaultMdxComponents.Callout).toBeUndefined();
	});
});
