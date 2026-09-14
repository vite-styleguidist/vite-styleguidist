#!/usr/bin/env node

import mri from 'mri';
import kleur from 'kleur';
import open from 'open';
import { stringify } from 'q-i';
import glogg from 'glogg';
import getConfig from '../scripts/config.js';
import setupLogger from '../scripts/logger.js';
import * as consts from '../scripts/consts.js';
import StyleguidistError from '../scripts/utils/error.js';
import type * as Rsg from '../typings/index.js';

const logger = glogg('rsg');

// `engines` in package.json is advisory for npm (it only warns, unless the user sets
// engine-strict), and the compiled lib/ relies on features older or odd-numbered Node.js lines
// lack (require(esm), recent Vite), so an unsupported runtime would fail somewhere deep with an
// error that points nowhere near the cause. Refuse early instead. Keep in sync with `engines`.
const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number);
if (!(nodeMajor >= 24 || (nodeMajor === 22 && nodeMinor >= 12))) {
	console.error(
		kleur
			.bold()
			.red(
				`Vite Styleguidist needs Node.js 22.12 or newer (Node 23 is not supported), you are running ${process.version}.`
			)
	);
	process.exit(1);
}

const argv = mri(process.argv.slice(2));
const command = argv._[0];

// Set environment before loading style guide config because user’s Vite config may use it
const env: Rsg.StyleguidistEnv = command === 'build' ? 'production' : 'development';
process.env.NODE_ENV = process.env.NODE_ENV || env;

// Load style guide config. `doctor` is the exception: it loads the config itself, in a mode
// that collects every problem instead of dying on the first one — reporting them is its job.
let config!: Rsg.SanitizedStyleguidistConfig;
if (command !== 'doctor') {
	try {
		config = getConfig(argv.config, updateConfig);
	} catch (err) {
		if (err instanceof StyleguidistError) {
			const link = consts.DOCS_CONFIG + (err.extra ? `#${err.extra.toLowerCase()}` : '');
			printErrorWithLink(err.message, `Learn how to configure your style guide:`, link);
			process.exit(1);
		} else {
			throw err;
		}
	}
}

// Do not show nasty stack traces for Styleguidist errors
process.on('uncaughtException', (err) => {
	printError(err);
	process.exit(1);
});
process.on('unhandledRejection', (err) => {
	printError(err);
	process.exit(1);
});

if (command !== 'doctor') {
	verboseLog('Styleguidist config:', config);
}

switch (command) {
	case 'build':
		commandBuild();
		break;
	case 'server':
		commandServer();
		break;
	case 'doctor':
		commandDoctor();
		break;
	default:
		commandHelp();
}

/**
 * @param {object} prevConfig
 * @return {object}
 */
function updateConfig(prevConfig: Rsg.StyleguidistConfig): Rsg.StyleguidistConfig {
	// Set verbose mode from config option or command line switch
	const verbose = prevConfig.verbose || argv.verbose;

	// Set serverPort from from command line or config option
	const serverPort = parseInt(argv.port) || prevConfig.serverPort;

	// `--no-cache` ignores (and does not write) the persistent parse cache for one run. mri
	// turns `--no-<name>` into `<name>: false`, so an absent flag leaves the option alone.
	const cache = argv.cache === false ? false : prevConfig.cache;

	// Setup logger *before* config validation (because validations may use logger to print warnings)
	setupLogger(prevConfig.logger as Record<string, (message: string) => void>, verbose);

	return {
		...prevConfig,
		verbose,
		serverPort,
		cache,
	};
}

async function commandBuild() {
	console.log('Building style guide...');

	const { default: build } = await import('../scripts/build.js');
	try {
		await build(config);
	} catch (err) {
		printError(err);
		process.exit(1);
	}

	if (config.printBuildInstructions) {
		config.printBuildInstructions(config);
	} else {
		printBuildInstructions(config);
	}
}

async function commandServer() {
	const { default: server } = await import('../scripts/server.js');
	let devServer;
	try {
		devServer = await server(config);
	} catch (err: any) {
		if (err && err.code === 'EADDRINUSE') {
			printErrorWithLink(
				`Another server is running at port ${config.serverPort} already. Please stop it or change the default port to continue.`,
				'You can change the port using the `serverPort` option in your style guide config:',
				consts.DOCS_CONFIG
			);
		} else {
			printError(err, 'Failed to start the dev server');
		}
		process.exit(1);
	}
	if (!devServer) {
		return;
	}

	verboseLog('Vite config:', devServer.config);

	const isHttps = !!devServer.config.server.https;
	const urls = {
		local: devServer.resolvedUrls?.local ?? [],
		network: devServer.resolvedUrls?.network ?? [],
	};

	if (config.printServerInstructions) {
		config.printServerInstructions(config, { isHttps, urls });
	} else {
		printServerInstructions(urls);
	}

	if (argv.open && urls.local[0]) {
		// A failed browser launch must not kill the dev server (the rejection would
		// otherwise hit the global unhandledRejection handler and exit the process)
		open(urls.local[0]).catch((err: Error) => {
			logger.warn(`Cannot open the browser: ${err.message}`);
		});
	}
}

async function commandDoctor() {
	const { default: doctor, formatDoctorReport } = await import('../scripts/doctor.js');

	let report;
	try {
		report = doctor({ config: argv.config });
	} catch (err) {
		// Only thrown when there is nothing to diagnose (a `--config` path that does not exist,
		// a config file that cannot be loaded at all)
		printError(err, 'Cannot run the doctor');
		process.exit(1);
	}

	console.log(argv.json ? JSON.stringify(report, null, 2) : formatDoctorReport(report));

	// `process.exitCode` rather than `process.exit()`: writes to a pipe are asynchronous on
	// macOS, and exiting straight after a large `--json` report would truncate it
	process.exitCode = report.ok ? 0 : 1;
}

function commandHelp() {
	console.log(
		[
			kleur.underline('Usage'),
			'',
			'    ' +
				kleur.bold('styleguidist') +
				' ' +
				kleur.cyan('<command>') +
				' ' +
				kleur.yellow('[<options>]'),
			'',
			kleur.underline('Commands'),
			'',
			'    ' + kleur.cyan('build') + '           Build style guide',
			'    ' + kleur.cyan('server') + '          Run development server',
			'    ' +
				kleur.cyan('doctor') +
				'          Check the config, the environment and the project for problems',
			'    ' + kleur.cyan('help') + '            Display Vite Styleguidist help',
			'',
			kleur.underline('Options'),
			'',
			'    ' + kleur.yellow('--config') + '        Config file path',
			'    ' + kleur.yellow('--port') + '          Port to run development server on',
			'    ' + kleur.yellow('--open') + '          Open Styleguidist in the default browser',
			'    ' +
				kleur.yellow('--no-cache') +
				'      Ignore the parse cache for this run (build, server)',
			'    ' + kleur.yellow('--verbose') + '       Print debug information',
			'    ' + kleur.yellow('--json') + '          Print the doctor report as JSON',
		].join('\n')
	);
}

/**
 * @param {object} urls
 */
function printServerInstructions(urls: { local: string[]; network: string[] }) {
	console.log(`You can now view your style guide in the browser:`);
	console.log();
	urls.local.forEach((url) => {
		console.log(`  ${kleur.bold('Local:')}            ${kleur.cyan(url)}`);
	});
	urls.network.forEach((url) => {
		console.log(`  ${kleur.bold('On your network:')}  ${kleur.cyan(url)}`);
	});
	console.log();
}

/**
 * @param {object} config
 */
function printBuildInstructions({ styleguideDir }: Rsg.SanitizedStyleguidistConfig) {
	console.log('Style guide published to:\n' + kleur.underline(styleguideDir));
}

/**
 * @param {string} message
 * @param {string} linkTitle
 * @param {string} linkUrl
 */
function printErrorWithLink(message: string, linkTitle: string, linkUrl: string) {
	console.error(`${kleur.bold().red(message)}\n\n${linkTitle}\n${kleur.underline(linkUrl)}\n`);
}

/**
 * Print an error: Styleguidist errors without stack traces, Vite build errors
 * (which aggregate several errors) one by one, anything else with its stack.
 */
function printError(err: unknown, banner = 'Failed to compile') {
	if (err instanceof StyleguidistError) {
		console.error(kleur.bold().red(err.message));
		logger.debug(err.stack || '');
		return;
	}
	const errors: unknown[] =
		err && typeof err === 'object' && Array.isArray((err as { errors?: unknown[] }).errors)
			? (err as { errors: unknown[] }).errors
			: [err];
	printStatus(banner, 'error');
	console.error();
	errors.forEach((error) => {
		if (error instanceof Error) {
			console.error(argv.verbose ? error.stack : error.message);
		} else {
			console.error(String(error));
		}
	});
}

/**
 * @param {string} text
 * @param {'success'|'error'|'warning'} type
 */
function printStatus(text: string, type: 'success' | 'error' | 'warning') {
	if (type === 'success') {
		console.log(kleur.inverse().bold().green(' DONE ') + ' ' + text);
	} else if (type === 'error') {
		console.error(kleur.inverse().bold().red(' FAIL ') + ' ' + kleur.red(text));
	} else {
		console.error(kleur.inverse().bold().yellow(' WARN ') + ' ' + kleur.yellow(text));
	}
}

/**
 * @param {string} header
 * @param {object} object
 */
function verboseLog(header: string, object: unknown) {
	logger.debug(kleur.bold(header) + '\n\n' + stringify(object));
}
