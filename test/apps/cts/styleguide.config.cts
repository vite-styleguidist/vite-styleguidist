// `.cts` config in a `"type": "module"` package: the extension makes it CommonJS anyway,
// so `module.exports` and `__dirname` are the ones that work here
import path from 'node:path';

module.exports = {
	title: 'CTS Style Guide',
	assetsDir: path.resolve(__dirname),
};
