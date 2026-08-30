import fs from 'node:fs';
import path from 'node:path';

/**
 * Return user’s package.json.
 *
 * @return {object}
 */
export default function getUserPackageJson(): Record<string, any> {
	try {
		return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'));
	} catch {
		return {};
	}
}
