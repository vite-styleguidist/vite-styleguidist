// TypeScript config in a `"type": "module"` package: it stays an ES module when the types
// are stripped, so `import.meta.url` still resolves — to a file in this folder.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// A type-only import of a module that only exists as TypeScript: it has to be gone by the
// time Node runs the file, or loading the config would fail on a missing module.
import type { StyleguidistConfig } from '../../../src/typings/index.js';

const config: StyleguidistConfig = {
	title: 'TS Style Guide',
	assetsDir: path.dirname(fileURLToPath(import.meta.url)),
};

export default config;
