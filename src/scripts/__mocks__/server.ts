// Manual mock of ../server.js, see build.ts for how specs use it.
import type * as Rsg from '../../typings/index.js';

export const MOCK_SERVER = { listening: true };

export default async function server(
	config: Rsg.SanitizedStyleguidistConfig,
	callback?: (err?: Error, server?: typeof MOCK_SERVER) => void
) {
	if (callback) {
		callback(undefined, MOCK_SERVER);
	}
	return MOCK_SERVER;
}
