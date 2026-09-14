// The other common mistake: a CommonJS `require()` (as in the Cookbook recipes) in a `.js`
// file of a `"type": "module"` package. It throws before `module.exports` is ever reached,
// so the message has to name `require` rather than `module.exports`.
const path = require('node:path');

module.exports = {
	title: 'Broken Style Guide',
	styleguideComponents: {
		Editor: path.join(__dirname, 'src/styleguide/Editor'),
	},
};
