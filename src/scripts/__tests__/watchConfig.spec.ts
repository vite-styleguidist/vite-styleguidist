import { EventEmitter } from 'node:events';
import type { ViteDevServer } from 'vite';
import watchConfig, { handleConfigChange } from '../watchConfig.js';
import { getConfigFilepath, reloadConfig } from '../config.js';
import makeViteConfig from '../make-vite-config.js';
import StyleguidistError from '../utils/error.js';
import type * as Rsg from '../../typings/index.js';

// Reading a config file has its own tests (config.spec.ts) and building a Vite config is
// slow; here only the decisions around them are under test
vi.mock('../config.js', () => ({
	getConfigFilepath: vi.fn(),
	reloadConfig: vi.fn(),
}));
vi.mock('../make-vite-config.js', () => ({ default: vi.fn() }));

const CONFIG_FILE = '/pizza/styleguide.config.ts';

const config = { title: 'Before' } as unknown as Rsg.SanitizedStyleguidistConfig;
const nextConfig = { title: 'After' } as unknown as Rsg.SanitizedStyleguidistConfig;

/** Minimal stand-in for the bits of a Vite dev server `watchConfig()` talks to. */
function fakeDevServer(inlineConfig: Record<string, unknown> = { root: '/pizza' }) {
	const watcher = new EventEmitter() as EventEmitter & { add: ReturnType<typeof vi.fn> };
	watcher.add = vi.fn();
	const devServer = {
		watcher,
		restart: vi.fn(async () => undefined),
		config: {
			inlineConfig,
			logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
		},
	};
	return devServer as unknown as ViteDevServer & typeof devServer;
}

/** Let the queued (asynchronous) change handler finish. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
	vi.mocked(getConfigFilepath).mockReturnValue(CONFIG_FILE);
	vi.mocked(reloadConfig).mockReturnValue(nextConfig);
	vi.mocked(makeViteConfig).mockResolvedValue({ root: '/pizza', mode: 'development' });
});

afterEach(() => {
	vi.clearAllMocks();
});

describe('handleConfigChange', () => {
	const options = () => ({
		filename: 'styleguide.config.ts',
		reload: vi.fn(() => nextConfig),
		restart: vi.fn(async () => undefined),
		log: vi.fn(),
		logError: vi.fn(),
	});

	it('should restart the server with the config it has just read', async () => {
		const opts = options();
		await expect(handleConfigChange(opts)).resolves.toBe('restarted');
		expect(opts.restart).toHaveBeenCalledWith(nextConfig);
		expect(opts.log).toHaveBeenCalledWith(
			'styleguide.config.ts changed, restarting the style guide...'
		);
		expect(opts.logError).not.toHaveBeenCalled();
	});

	it('should keep the server running when the new config is invalid', async () => {
		const opts = options();
		opts.reload.mockImplementation(() => {
			throw new StyleguidistError('Something is wrong with your style guide config');
		});

		await expect(handleConfigChange(opts)).resolves.toBe('invalid');
		expect(opts.restart).not.toHaveBeenCalled();
		// Nothing is restarting, so nothing may say so
		expect(opts.log).not.toHaveBeenCalled();
		expect(opts.logError).toHaveBeenCalledWith(
			expect.stringContaining('Something is wrong with your style guide config')
		);
		expect(opts.logError).toHaveBeenCalledWith(
			expect.stringContaining('still running with the previous config')
		);
	});

	it('should report a failed restart', async () => {
		const opts = options();
		opts.restart.mockRejectedValue(new Error('No port for you'));

		await expect(handleConfigChange(opts)).resolves.toBe('failed');
		expect(opts.logError).toHaveBeenCalledWith(expect.stringContaining('No port for you'));
	});
});

describe('watchConfig', () => {
	it('should do nothing for a config that wasn’t read from a file', () => {
		vi.mocked(getConfigFilepath).mockReturnValue(undefined);
		const devServer = fakeDevServer();

		watchConfig(config, devServer);

		expect(devServer.watcher.add).not.toHaveBeenCalled();
		expect(devServer.watcher.listenerCount('change')).toBe(0);
	});

	it('should watch the config file even when it is outside the project', () => {
		const devServer = fakeDevServer();
		watchConfig(config, devServer);
		expect(devServer.watcher.add).toHaveBeenCalledWith(CONFIG_FILE);
	});

	it('should ignore changes to any other file', async () => {
		const devServer = fakeDevServer();
		watchConfig(config, devServer);

		devServer.watcher.emit('change', '/pizza/src/components/Button.js');
		await flush();

		expect(reloadConfig).not.toHaveBeenCalled();
		expect(devServer.restart).not.toHaveBeenCalled();
	});

	it('should restart the server with the Vite config of the changed style guide config', async () => {
		const inlineConfig = { root: '/pizza', clearScreen: false };
		const devServer = fakeDevServer(inlineConfig);
		watchConfig(config, devServer);

		devServer.watcher.emit('change', CONFIG_FILE);
		await flush();

		expect(makeViteConfig).toHaveBeenCalledWith(nextConfig, 'development');
		// Vite restarts from this very object, and an option the edited config no longer sets
		// must be gone from it
		expect(inlineConfig).toEqual({ root: '/pizza', mode: 'development' });
		expect(devServer.restart).toHaveBeenCalled();
	});

	it('should watch again after the restart, with the config that is now running', async () => {
		const devServer = fakeDevServer();
		watchConfig(config, devServer);

		devServer.watcher.emit('change', CONFIG_FILE);
		await flush();

		// Vite hands the restarted server a new watcher; ours is registered on it again
		expect(devServer.watcher.add).toHaveBeenCalledTimes(2);
		expect(vi.mocked(getConfigFilepath).mock.calls.at(-1)).toEqual([nextConfig]);
	});

	it('should keep serving when the changed config file is broken', async () => {
		const devServer = fakeDevServer();
		vi.mocked(reloadConfig).mockImplementation(() => {
			throw new StyleguidistError('Something is wrong with your style guide config');
		});
		watchConfig(config, devServer);

		devServer.watcher.emit('change', CONFIG_FILE);
		await flush();

		expect(devServer.restart).not.toHaveBeenCalled();
		expect(devServer.config.logger.error).toHaveBeenCalledWith(
			expect.stringContaining('Something is wrong with your style guide config'),
			{ timestamp: true }
		);
	});

	// One save can reach the watcher as several events, and two restarts at once would fight
	// over the same port
	it('should never run two restarts at the same time', async () => {
		const devServer = fakeDevServer();
		let running = 0;
		let overlapped = false;
		devServer.restart.mockImplementation(async () => {
			overlapped ||= running > 0;
			running += 1;
			await flush();
			running -= 1;
		});
		watchConfig(config, devServer);

		devServer.watcher.emit('change', CONFIG_FILE);
		devServer.watcher.emit('change', CONFIG_FILE);
		await flush();
		await flush();
		await flush();

		// Both changes are handled, one after the other
		expect(devServer.restart).toHaveBeenCalledTimes(2);
		expect(overlapped).toBe(false);
	});
});
