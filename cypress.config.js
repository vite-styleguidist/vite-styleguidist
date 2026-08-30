import { defineConfig } from 'cypress';

// End-to-end tests run against `npm run test:cypress:startServer` (test/run.server.js).
export default defineConfig({
	e2e: {
		baseUrl: 'http://localhost:8082',
		// The specs visit the page once per suite (in `before`), like they always did;
		// Cypress 12+ would otherwise blank the page between tests
		testIsolation: false,
		specPattern: 'test/cypress/integration/**/*.js',
		supportFile: 'test/cypress/support/index.js',
		fixturesFolder: 'test/cypress/fixtures',
		screenshotsFolder: 'test/cypress/screenshots',
		videosFolder: 'test/cypress/videos',
		video: false,
		chromeWebSecurity: false,
	},
});
