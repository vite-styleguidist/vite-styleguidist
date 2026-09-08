// `.ts` config in a CommonJS package: it is compiled to CommonJS, the way TypeScript and
// Node.js would both read it, so `__dirname` is available and `export default` still works
const config = {
	title: 'TS CommonJS Style Guide',
	assetsDir: __dirname,
};

export default config;
