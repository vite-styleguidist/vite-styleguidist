import styleguidist from './index.esm.js';

export default styleguidist;
export * from '../typings/index.js';

// Let CommonJS consumers keep writing `require('vite-styleguidist')(config)`:
// Node’s require(esm) returns this export instead of the module namespace.
export { styleguidist as 'module.exports' };
