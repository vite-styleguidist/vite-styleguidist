// One-off codemod used during the ESM migration: rewrites extensionless relative
// imports (`./foo`, `../bar`) in src/**/*.{ts,tsx,js} to explicit `.js` paths
// (`./foo.js`, `../bar/index.js`) so the compiled output is valid native ESM.
// It only rewrites specifiers that resolve to a real source file or directory,
// so strings inside tests that merely *look* like paths are left alone.
//
// Usage: node scripts/add-js-extensions.js [dir=src]
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || 'src');
const SOURCE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs'];
const SKIP_EXTS = new Set(['.js', '.mjs', '.cjs', '.json', '.md', '.css', '.svg', '.png', '.d.ts']);

function walk(dir, out = []) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name !== 'node_modules') {
				walk(full, out);
			}
		} else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
			out.push(full);
		}
	}
	return out;
}

function resolveSpecifier(fromFile, spec) {
	if (SKIP_EXTS.has(path.extname(spec)) || spec.endsWith('.d.ts')) {
		return null;
	}
	const base = path.resolve(path.dirname(fromFile), spec);
	for (const ext of SOURCE_EXTS) {
		if (fs.existsSync(base + ext) && fs.statSync(base + ext).isFile()) {
			return `${spec}.js`;
		}
	}
	if (fs.existsSync(base) && fs.statSync(base).isDirectory()) {
		for (const ext of SOURCE_EXTS) {
			if (fs.existsSync(path.join(base, `index${ext}`))) {
				return `${spec}/index.js`;
			}
		}
	}
	return null;
}

// Matches the specifier of: import x from '..', import '..', export * from '..',
// export { x } from '..', require('..'), import('..'), vi.mock('..'), jest.mock('..')
const SPECIFIER_RE =
	/((?:from\s*|import\s*|require\(\s*|import\(\s*|mock\(\s*))(['"])(\.{1,2}\/[^'"]+)\2/g;

let changedFiles = 0;
let changedSpecifiers = 0;
for (const file of walk(root)) {
	const source = fs.readFileSync(file, 'utf8');
	const next = source.replace(SPECIFIER_RE, (match, prefix, quote, spec) => {
		const resolved = resolveSpecifier(file, spec);
		if (!resolved) {
			return match;
		}
		changedSpecifiers += 1;
		return `${prefix}${quote}${resolved}${quote}`;
	});
	if (next !== source) {
		fs.writeFileSync(file, next);
		changedFiles += 1;
	}
}
console.log(`Rewrote ${changedSpecifiers} specifiers in ${changedFiles} files`);
