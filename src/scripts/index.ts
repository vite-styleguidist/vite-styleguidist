import styleguidist from './index.esm.js';
import { defineConfig } from './defineConfig.js';

export default styleguidist;
export { defineConfig };
export * from '../typings/index.js';

// Let CommonJS consumers keep writing `require('vite-styleguidist')(config)`:
// Node’s require(esm) returns this export instead of the module namespace. It is the
// `styleguidist` function itself, so every named export would be lost on the way — hang the
// ones that are values (the types are a compile-time affair) off the function so that
// `require('vite-styleguidist').defineConfig` keeps working too.
const commonjsExport = Object.assign(styleguidist, { defineConfig });

export { commonjsExport as 'module.exports' };
