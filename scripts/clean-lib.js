// Removes the compiled `lib/` directory before a fresh `tsc` build.
// (tsc never deletes stale output files, so renamed/removed sources would otherwise linger.)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const lib = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../lib');
fs.rmSync(lib, { recursive: true, force: true });
