/**
 * One thing `styleguidist doctor` has to say about a project.
 *
 * This is also the shape `--json` prints, so it is a public contract: fields may be added,
 * but an `id` never changes its meaning and a `level` never gets a new value without a bump
 * of `reportVersion` below.
 */
export interface DoctorFinding {
	/** Stable identifier of the check, e.g. `config.removed-option`. Safe to match on in CI */
	id: string;
	level: DoctorLevel;
	/** What is wrong, in one line, without colors or line breaks */
	title: string;
	/** The details: the original validation message, a list of names, a version… */
	detail?: string;
	/** What to do about it, in one line */
	fix?: string;
	/** Documentation page (with an anchor) backing the fix */
	docs?: string;
	/** Absolute path of the file the finding is about */
	file?: string;
	/** Absolute paths, when a finding is about several files */
	files?: string[];
	/** Check specific extras: the option name, the versions compared, the variables found… */
	meta?: Record<string, unknown>;
}

export type DoctorLevel = 'error' | 'warning' | 'info';

export const LEVELS: DoctorLevel[] = ['error', 'warning', 'info'];

export interface DoctorReport {
	/**
	 * Version of *this shape*, bumped whenever a change could break a consumer of `--json`.
	 * Adding a finding, or a new optional field, is not such a change.
	 */
	reportVersion: number;
	/** False when there is at least one error; the process exit code follows it */
	ok: boolean;
	/** Version of the vite-styleguidist package running the checks */
	styleguidistVersion: string;
	/** Version of Node.js running the checks, e.g. `v24.4.0` */
	node: string;
	/** Absolute path of the style guide config, null when none was found */
	configFile: string | null;
	counts: Record<DoctorLevel, number>;
	findings: DoctorFinding[];
}

export const REPORT_VERSION = 1;
