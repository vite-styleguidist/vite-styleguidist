import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The app’s own Vite config. Styleguidist picks it up automatically (it looks for
// vite.config.* next to styleguide.config.js), so aliases, plugins, CSS options,
// etc. are shared with the style guide without any duplication.
export default defineConfig({
	plugins: [react()],
});
