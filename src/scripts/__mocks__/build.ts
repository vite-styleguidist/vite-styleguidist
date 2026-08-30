// Manual mock of ../build.js. Vitest does not pick up `__mocks__` folders automatically
// for relative modules: specs opt in with `vi.mock('../build.js', () => import('../__mocks__/build.js'))`.
import type * as Rsg from '../../typings/index.js';

export const MOCK_BUILD_OUTPUT = { stats: true };

export default async function build(
	config: Rsg.SanitizedStyleguidistConfig,
	callback?: (err: Error | null, output?: typeof MOCK_BUILD_OUTPUT) => void
) {
	if (callback) {
		callback(null, MOCK_BUILD_OUTPUT);
	}
	return MOCK_BUILD_OUTPUT;
}
