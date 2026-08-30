import 'styled-components';
import type theme from './theme';

// styled-components v6 types `props.theme` as `DefaultTheme`, which is empty
// until augmented: derive it from the actual theme object so that
// `props.theme.colors.primary` etc. are typed in styled templates.
type Theme = typeof theme;

declare module 'styled-components' {
	export interface DefaultTheme extends Theme {}
}
