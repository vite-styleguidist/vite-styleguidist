import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import getUserPackageJson from '../getUserPackageJson.js';

const cwd = process.cwd();
afterEach(() => {
	process.chdir(cwd);
});

it('should return object with package.json contents', () => {
	process.chdir('test/apps/defaults');
	const result = getUserPackageJson();
	expect(result).toBeTruthy();
	expect(result.name).toBe('Pizza');
});

it('should return an empty object when there is no package.json', () => {
	// A fresh temporary directory has no package.json (and none is looked up in parents)
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsg-no-package-'));
	try {
		process.chdir(dir);
		expect(getUserPackageJson()).toEqual({});
	} finally {
		process.chdir(cwd);
		fs.rmSync(dir, { recursive: true, force: true });
	}
});
