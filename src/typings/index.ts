// `RecursivePartial` is part of the public config type — `theme` and `styles` are declared
// with it — so a config file that wants to name the type of a partial theme of its own needs
// it too (see docs/API.md).
export * from './RecursivePartial.js';
export * from './RsgComponent.js';
export * from './RsgDocgen.js';
export * from './RsgEditor.js';
export * from './RsgExample.js';
export * from './RsgImportMarker.js';
export * from './RsgPropsObject.js';
export * from './RsgSection.js';
export * from './RsgStyleguidistConfig.js';
export * from './RsgTheme.js';

// JSS’s own type, which the public `styles` option is declared with: a config file that
// wants to name the type of its styles should not have to depend on jss itself.
export type { Styles } from 'jss';
