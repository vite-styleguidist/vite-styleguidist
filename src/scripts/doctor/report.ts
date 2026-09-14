import path from 'node:path';
import kleur from 'kleur';
import { LEVELS, REPORT_VERSION } from './types.js';
import type { DoctorFinding, DoctorLevel, DoctorReport } from './types.js';

const HEADINGS: Record<DoctorLevel, string> = {
	error: 'Errors',
	warning: 'Warnings',
	info: 'Info',
};

const COLORS: Record<DoctorLevel, (text: string) => string> = {
	error: kleur.red,
	warning: kleur.yellow,
	info: kleur.cyan,
};

/** How many of a finding’s files the human report prints before it says “and N more”. */
const MAX_FILES_SHOWN = 5;

export function buildReport(
	findings: DoctorFinding[],
	meta: { configFile: string | null; styleguidistVersion: string }
): DoctorReport {
	const counts = { error: 0, warning: 0, info: 0 };
	for (const finding of findings) {
		counts[finding.level]++;
	}
	return {
		reportVersion: REPORT_VERSION,
		ok: counts.error === 0,
		styleguidistVersion: meta.styleguidistVersion,
		node: process.version,
		configFile: meta.configFile,
		counts,
		// Errors first, then warnings, then info; findings keep their order inside a level so a
		// config problem is always listed in the order the options are validated
		findings: LEVELS.flatMap((level) => findings.filter((finding) => finding.level === level)),
	};
}

/** Shorten a path for display: relative to the project when it is inside it, absolute when not. */
function displayPath(file: string, root: string): string {
	const relative = path.relative(root, file);
	return relative && !relative.startsWith('..') && !path.isAbsolute(relative) ? relative : file;
}

function formatFinding(finding: DoctorFinding, index: number, root: string): string {
	const indent = '     ';
	const lines = [`  ${index}. ${finding.title}`];
	if (finding.detail) {
		for (const line of finding.detail.split('\n')) {
			lines.push(indent + line);
		}
	}
	const files = finding.files || (finding.file ? [finding.file] : []);
	if (files.length > 0 && !finding.detail?.includes(files[0])) {
		const shown = files.slice(0, MAX_FILES_SHOWN).map((file) => displayPath(file, root));
		if (files.length > MAX_FILES_SHOWN) {
			shown.push(`and ${files.length - MAX_FILES_SHOWN} more`);
		}
		lines.push(`${indent}${kleur.dim('Files:')} ${shown.join(', ')}`);
	}
	if (finding.fix) {
		lines.push(`${indent}${kleur.dim('Fix:')}   ${finding.fix}`);
	}
	if (finding.docs) {
		lines.push(`${indent}${kleur.dim('Docs:')}  ${kleur.underline(finding.docs)}`);
	}
	return lines.join('\n');
}

/** `2 errors and 1 warning`, or an empty string when there is nothing to count. */
function summary(counts: Record<DoctorLevel, number>): string {
	const parts: string[] = [];
	if (counts.error > 0) {
		parts.push(`${counts.error} ${counts.error === 1 ? 'error' : 'errors'}`);
	}
	if (counts.warning > 0) {
		parts.push(`${counts.warning} ${counts.warning === 1 ? 'warning' : 'warnings'}`);
	}
	return parts.join(' and ');
}

/**
 * The report as a terminal prints it: findings grouped by level, each with its one-line fix and
 * the documentation section that explains it. Colours come from kleur, which turns itself off
 * when the output is not a terminal — so this is also what a CI log and a test see.
 */
export default function formatReport(report: DoctorReport): string {
	const root = report.configFile ? path.dirname(report.configFile) : process.cwd();
	const blocks: string[] = [
		kleur.bold(`Vite Styleguidist doctor ${report.styleguidistVersion}`),
		report.configFile
			? `Config: ${report.configFile}`
			: 'Config: none found, checking the current directory with the default options.',
	];

	for (const level of LEVELS) {
		const findings = report.findings.filter((finding) => finding.level === level);
		if (findings.length === 0) {
			continue;
		}
		blocks.push(
			[
				COLORS[level](kleur.bold(`${HEADINGS[level]} (${findings.length})`)),
				'',
				...findings.map((finding, index) => formatFinding(finding, index + 1, root)),
			].join('\n')
		);
	}

	const counted = summary(report.counts);
	blocks.push(
		counted
			? `Found ${counted}.`
			: kleur.green('No problems found, your style guide config is ready to go.')
	);

	return blocks.join('\n\n') + '\n';
}
