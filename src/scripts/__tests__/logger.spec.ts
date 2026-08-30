import glogg from 'glogg';
import setupLogger from '../logger.js';

const logger = glogg('rsg');
afterEach(() => {
	logger.removeAllListeners();
});

test('should setup custom logger function', () => {
	const info = vi.fn();
	const message = 'pizza';
	setupLogger({ info }, false);
	logger.info(message);
	expect(info).toHaveBeenCalledWith(message);
});

test('should setup debug logger in verbose mode', () => {
	const debug = vi.fn();
	const message = 'pizza';
	setupLogger({ debug }, true);
	logger.debug(message);
	expect(debug).toHaveBeenCalledWith(message);
});

test('should not setup debug logger in non-verbose mode', () => {
	const debug = vi.fn();
	const message = 'pizza';
	setupLogger({ debug }, false);
	logger.debug(message);
	expect(debug).toHaveBeenCalledTimes(0);
});

test('should accept default loggers', () => {
	const info = vi.fn();
	const message = 'pizza';
	setupLogger(undefined, false, { info });
	logger.info(message);
	expect(info).toHaveBeenCalledWith(message);
});
