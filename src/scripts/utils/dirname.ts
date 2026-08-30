import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * ESM replacement for CommonJS `__dirname`: `dirname(import.meta.url)`.
 */
export default function dirname(importMetaUrl: string): string {
	return path.dirname(fileURLToPath(importMetaUrl));
}
