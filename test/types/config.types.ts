// Checks of the types a config file is written against. Nothing runs them: `npm run
// typecheck` compiling this file is the test, and every line below fails it if the package
// stops exporting a type a config needs, or stops checking a config the way it should.
//
// The published package is a different question — an `exports` map or a declaration file
// can be wrong in the tarball while it is right here — and only a project that installs the
// tarball can answer it. See docs/API.md for the types themselves.
import { defineConfig } from '../../src/scripts/index.js';
import type {
	ConfigSection,
	RecursivePartial,
	StyleguidistConfig,
	Styles,
	Theme,
} from '../../src/scripts/index.js';

// A theme of one’s own is a *deep* partial: naming one colour must not ask for the other 30
const theme: RecursivePartial<Theme> = { color: { link: 'tomato' } };
const styles: Styles = { Logo: { logo: { color: 'salmon' } } };
const sections: ConfigSection[] = [{ name: 'UI', components: 'src/ui/*.tsx' }];

export const config: StyleguidistConfig = defineConfig({
	title: 'Style guide',
	components: 'src/components/**/*.tsx',
	theme,
	styles,
	sections,
});

export const misspelled = defineConfig({
	// @ts-expect-error an option the style guide has never heard of is an error, not a key
	// that is quietly ignored until someone wonders why the title never changed
	titel: 'Style guide',
});

export const wrongType = defineConfig({
	// @ts-expect-error the option exists, the value is of the wrong type
	components: 42,
});
