// Common mistake: CommonJS syntax in a `.js` file of a `"type": "module"` package.
// Styleguidist should explain the problem instead of failing with Node's ReferenceError.
module.exports = {
	title: 'Broken Style Guide',
};
