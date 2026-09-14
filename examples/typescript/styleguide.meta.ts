// Everything `styleguide.config.ts` is better off not holding itself.
//
// A config file is a module like any other, so a `sections` tree, a theme or a props parser
// that has outgrown it can live next door and be imported back. That is worth showing here
// because it is the one part of a TypeScript config that is *not* free: Styleguidist
// compiles the config file and nothing else, so this module is left to Node.js, which strips
// its types itself from version 22.18 on. See Readme.md, "Importing another TypeScript
// module", for the two ways out on an older Node.
import type { ConfigSection } from 'vite-styleguidist';

/** Shown in the sidebar header and in the `<title>` of every page. */
export const title = 'Vite Styleguidist TypeScript Example';

/**
 * The sidebar tree.
 *
 * The annotation is the point of the exercise: `ConfigSection[]` is checked here, in the file
 * the sections are written in, so a `componenets` typo or a `description` that is accidentally
 * an array is a red squiggle rather than a section that silently comes out empty. It is the
 * same type `defineConfig` would have applied to an inline array — writing it out is what
 * keeps the checking when the array moves into a module of its own.
 *
 * Nesting is typed too: `sections` is `ConfigSection[]` again, all the way down.
 */
export const sections: ConfigSection[] = [
	{
		name: 'Controls',
		description: 'Components the user types into, presses or picks from.',
		components: [
			'src/components/Button.tsx',
			'src/components/Field.tsx',
			'src/components/Select.tsx',
		],
	},
	{
		name: 'Feedback',
		description: 'Components that only report state back.',
		components: ['src/components/Badge.tsx'],
	},
];
