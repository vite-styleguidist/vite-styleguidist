// Starts the basic example with the compiled package; used by the Cypress tests (see package.json).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import styleguidist from '../lib/scripts/index.js';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../examples/basic/src');

styleguidist({
	components: path.resolve(dir, 'components/**/[A-Z]*.js'),
	moduleAliases: {
		'rsg-example': dir,
	},
	logger: {
		info: console.log,
		warn: (message) => console.warn(`Warning: ${message}`),
	},
	serverPort: 8082,
	// Do not require delays in integration tests
	previewDelay: 0,
}).server((err, config) => {
	if (err) {
		console.log(err);
	} else {
		console.log('Listening at http://' + config.serverHost + ':' + config.serverPort);
	}
});
