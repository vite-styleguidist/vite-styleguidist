module.exports = {
	title: 'Style guide example',
	components: './src/components/**/[A-Z]*.js',
	configureServer(app) {
		// `app` is the connect middleware stack of Vite’s dev server, not an Express
		// app: there is no `app.get()` or `res.send()`. Match the path with `use()`
		// (it also matches sub-paths, hence the method check) and write the response
		// with Node’s plain http API.
		app.use('/custom', (req, res, next) => {
			if (req.method !== 'GET') {
				next();
				return;
			}
			res.statusCode = 200;
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify({ response: 'Server invoked' }));
		});
	},
};
