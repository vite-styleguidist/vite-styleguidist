// Copies the few non-TypeScript runtime files into lib/ after `tsc` (which only
// emits compiled .ts/.tsx). Keep this list tiny and explicit.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const FILES = ['src/client/utils/assertShim.cjs'];

for (const file of FILES) {
	const target = path.join(root, file.replace(/^src\//, 'lib/'));
	fs.mkdirSync(path.dirname(target), { recursive: true });
	fs.copyFileSync(path.join(root, file), target);
}
