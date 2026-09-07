import path from 'node:path';
import { loadConfig } from './config.js';
import checkConfig from './doctor/checkConfig.js';
import checkEnvironment, { readOwnPackageJson } from './doctor/checkEnvironment.js';
import checkProject from './doctor/checkProject.js';
import formatReport, { buildReport } from './doctor/report.js';
import * as consts from './consts.js';
import type { DoctorFinding, DoctorReport } from './doctor/types.js';

export type { DoctorFinding, DoctorLevel, DoctorReport } from './doctor/types.js';
export { formatReport as formatDoctorReport };

export interface DoctorOptions {
	/** Path of the style guide config, like `--config`; looked up the usual way when omitted */
	config?: string;
	/** Cap of the project scan, for tests */
	maxFiles?: number;
}

/**
 * Diagnose a project: everything wrong with its style guide config, its environment, and the
 * webpack-era code Vite will not understand — in one pass, without stopping at the first
 * problem the way a build has to.
 *
 * Throws (a StyleguidistError) only when there is nothing to diagnose: a `--config` path that
 * does not exist, or a config file that cannot be loaded at all. Everything else is a finding.
 */
export default function doctor(options: DoctorOptions = {}): DoctorReport {
	const loaded = loadConfig(options.config);
	const configFile = loaded.configFilepath || null;
	// `configDir` comes from the schema, so it is missing exactly when validation never ran
	const configDir =
		loaded.config.configDir || (configFile ? path.dirname(configFile) : process.cwd());

	const findings: DoctorFinding[] = [];

	if (!configFile) {
		findings.push({
			id: 'config.not-found',
			level: 'info',
			title: 'No style guide config file found',
			detail: `Looked for styleguide.config.js, .mjs and .cjs in ${process.cwd()} and its parents.`,
			fix: 'Everything below is checked against the default options.',
			docs: consts.DOCS_CONFIG,
		});
	}

	findings.push(...checkConfig(loaded.problems));
	findings.push(...checkEnvironment(configDir));
	findings.push(...checkProject(loaded.config, configDir, { maxFiles: options.maxFiles }));

	return buildReport(findings, {
		configFile,
		styleguidistVersion: readOwnPackageJson().version || 'unknown',
	});
}
