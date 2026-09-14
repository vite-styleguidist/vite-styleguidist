// `.mts` config in a CommonJS package: the extension makes it an ES module anyway, so
// `import.meta.url` is what points at this folder here
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export default {
	title: 'MTS Style Guide',
	assetsDir: path.dirname(fileURLToPath(import.meta.url)),
};
