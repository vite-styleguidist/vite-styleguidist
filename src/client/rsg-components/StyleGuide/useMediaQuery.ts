import { useEffect, useState } from 'react';

/**
 * The raw query behind a theme `mq` value: `@media (max-width: 600px)` -> `(max-width:
 * 600px)`, which is what `window.matchMedia` expects.
 */
export const toMediaQuery = (mediaQuery: string): string => mediaQuery.replace(/^\s*@media\s*/, '');

/**
 * Subscribe to a media query.
 *
 * Almost every responsive decision belongs in the style sheets; this hook is for the
 * few that cannot be expressed there, namely rendering *different elements in a
 * different DOM order* per layout (the small-screen header owns the colour-scheme
 * control, and DOM order is what the tab order follows -- CSS `order` moves the box
 * but not the focus). It is safe without a DOM (a server render, an old test
 * environment): the query then simply never matches.
 */
export default function useMediaQuery(query: string): boolean {
	const [matches, setMatches] = useState(
		() => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(query).matches
	);

	useEffect(() => {
		if (typeof window === 'undefined' || !window.matchMedia) {
			return undefined;
		}
		const list = window.matchMedia(query);
		// No re-read here: the state was initialised from the same list during render,
		// and any change between that render and this effect fires `change` as well
		const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
		if (list.addEventListener) {
			list.addEventListener('change', onChange);
			return () => list.removeEventListener('change', onChange);
		}
		// Safari below 14 only has the deprecated MediaQueryList listener API
		list.addListener(onChange);
		return () => list.removeListener(onChange);
	}, [query]);

	return matches;
}
