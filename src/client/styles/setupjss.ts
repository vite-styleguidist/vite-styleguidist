import { create, GenerateId } from 'jss';
import global from 'jss-plugin-global';
import isolate from 'jss-plugin-isolate';
import nested from 'jss-plugin-nested';
import camelCase from 'jss-plugin-camel-case';
import defaultUnit from 'jss-plugin-default-unit';
import compose from 'jss-plugin-compose';
import nonInheritedProps from './nonInheritedProps.js';

/**
 * Generated class names look like `rsg--<ruleKey>-<suffix>`.
 *
 * The rule key is what users target in the `styles` config option and what specs
 * match with `/^rsg--foo-\d+$/`, so the prefix and the `<key>-<digits>` shape are
 * part of the contract (see ADR 0011). Only the suffix changed over time:
 *
 * - Sheets created through `createStyleSheet()` (every `Styled()` component) get a
 *   deterministic suffix computed from the component name and its rule keys, so every
 *   rule of one component shares one number (`rsg--root-1234 rsg--sidebar-1234`) and
 *   adding a rule to one component never renumbers another component’s classes.
 *   Before, a single global counter numbered rules in creation order, which made the
 *   Markdown snapshot churn whenever any earlier component gained or lost a rule.
 * - Anonymous sheets (the `body` sheet in styles.ts, the isolate reset sheet, ad-hoc
 *   sheets in specs) keep the counter: they have no stable identity to hash and nobody
 *   snapshots their names.
 */
const CLASS_PREFIX = 'rsg--';

/**
 * FNV-1a, 32 bit. Small, dependency-free and stable across runtimes; the result is
 * rendered as decimal digits so the `-\d+` suffix shape holds.
 */
export function hashString(input: string): number {
	let hash = 0x811c9dc5;
	for (let index = 0; index < input.length; index++) {
		hash ^= input.charCodeAt(index);
		hash = Math.imul(hash, 0x01000193);
	}
	return hash >>> 0;
}

// suffix -> identity that claimed it, to catch two different sheets hashing alike
const claimedSuffixes = new Map<number, string>();

/**
 * Suffix for the class names of a named sheet. Two calls with the same identity
 * return the same suffix; a (practically impossible, ~1e-7 for 50 sheets) hash
 * collision between different identities is resolved by re-hashing and reported,
 * because silently sharing a suffix would merge the styles of two components.
 */
export function getSheetSuffix(identity: string): number {
	let suffix = hashString(identity);
	let attempt = 0;
	while (claimedSuffixes.has(suffix) && claimedSuffixes.get(suffix) !== identity) {
		attempt += 1;
		// eslint-disable-next-line no-console
		console.warn(
			`Styleguidist: style sheets "${claimedSuffixes.get(suffix)}" and "${identity}" produce the same class-name suffix ${suffix}; re-hashing (attempt ${attempt})`
		);
		suffix = hashString(`${identity}#${attempt}`);
	}
	claimedSuffixes.set(suffix, identity);
	return suffix;
}

/**
 * Id generator for one named sheet: every rule gets the same suffix, only the rule
 * key varies. Passed as the `generateId` option of `jss.createStyleSheet()`.
 */
export function createSheetGenerateId(suffix: number): GenerateId {
	return (rule) => `${CLASS_PREFIX}${rule.key}-${suffix}`;
}

// Fallback for sheets created without a `generateId` option: the historical counter
const createGenerateId = () => {
	let counter = 0;
	return (rule: { key: string }) => `${CLASS_PREFIX}${rule.key}-${counter++}`;
};

const jss = create({
	createGenerateId,
	plugins: [
		global(),
		isolate({
			reset: {
				// Reset all inherited and non-inherited properties
				...nonInheritedProps,

				// “Global” styles for all components
				boxSizing: 'border-box',

				// Allow inheritance because it may be set on body and should be available for user components
				color: 'inherit',
				font: 'inherit',
				fontFamily: 'inherit',
				fontSize: 'inherit',
				fontWeight: 'inherit',
				lineHeight: 'inherit',
				// Without this the reset would set `cursor: auto` on every isolated element,
				// including the icons and labels inside a button or a link, so the pointer a
				// control declares for itself would stop at its own box. `cursor` is an
				// inherited property, so letting it through is what the browser does anyway.
				cursor: 'inherit',
			},
		}),
		nested(),
		camelCase(),
		defaultUnit(),
		compose(),
	],
});

export default jss;
