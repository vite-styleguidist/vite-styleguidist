import React, { useMemo } from 'react';
import markdownRenderers, { MarkdownRenderer } from 'rsg-components/Markdown/markdownRenderers';
import RsgPlayground from 'rsg-components/MdxPage/RsgPlayground';
import RsgStatic from 'rsg-components/MdxPage/RsgStatic';
import { useStyleGuideContext } from 'rsg-components/Context';

export type MdxComponents = Record<string, React.ComponentType<any>>;

/**
 * Turn one markdown-to-jsx override (`{component, props}`) into the plain component MDX wants.
 *
 * The fixed props come first so the document can still pass its own (`id` on a heading, `href`
 * on a link); nothing in the map is given a prop it also fixes, and the `.md` path binds them
 * in the same order.
 */
function toMdxComponent(name: string, { component: Component, props }: MarkdownRenderer) {
	if (!props) {
		return Component;
	}
	const Bound: React.FunctionComponent<Record<string, unknown>> = (ownProps) => (
		<Component {...props} {...ownProps} />
	);
	Bound.displayName = `Mdx(${name})`;
	return Bound;
}

/**
 * The element map every `.mdx` page is rendered with: the style guide’s own renderers for the
 * HTML elements (shared with `Markdown.tsx`, so the two prose pipelines cannot drift), plus the
 * two components the loader writes into the compiled page.
 *
 * Built once, at module scope: MDX destructures the map on every render, and a fresh map would
 * hand React new component types each time and remount the whole page.
 */
export const defaultMdxComponents: MdxComponents = {
	...Object.fromEntries(
		Object.entries(markdownRenderers).map(([name, renderer]) => [
			name,
			toMdxComponent(name, renderer),
		])
	),
	RsgPlayground,
	RsgStatic,
};

/**
 * Merge the `mdxComponents` config option over the defaults. The user wins: overriding `p` or
 * `a` is the documented way to restyle prose for MDX pages only, and any other key is a
 * component the pages can then use by name (`<Callout/>`).
 */
export function getMdxComponents(userComponents?: MdxComponents): MdxComponents {
	if (!userComponents) {
		return defaultMdxComponents;
	}
	return { ...defaultMdxComponents, ...userComponents };
}

/**
 * The `mdxComponents` config option, as the client sees it.
 *
 * Declared here rather than in `Rsg.StyleguidistConfig` because the option’s Node-side
 * declaration (config schema, `CLIENT_CONFIG_OPTIONS`) belongs to the loader/plugin side; this
 * is only the browser end of the same option, and it is optional so a config without it — every
 * config that predates MDX — is unaffected.
 */
interface ConfigWithMdxComponents {
	mdxComponents?: MdxComponents;
}

/** `getMdxComponents()` on the configured map, memoised so the map identity is stable. */
export function useMdxComponents(): MdxComponents {
	const { config } = useStyleGuideContext();
	const { mdxComponents } = config as typeof config & ConfigWithMdxComponents;
	return useMemo(() => getMdxComponents(mdxComponents), [mdxComponents]);
}

export default defaultMdxComponents;
