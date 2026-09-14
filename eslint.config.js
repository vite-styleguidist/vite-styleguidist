// ESLint 9 flat config (replaces .eslintrc + eslint-config-tamia).
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importX from 'eslint-plugin-import-x';
import globals from 'globals';

export default tseslint.config(
	{
		ignores: [
			'node_modules/**',
			'lib/**',
			// Git worktrees of parallel branches kept under .worktrees/ (excluded via .git/info/exclude), each with its own lib/ and node_modules
			'.worktrees/**',
			'coverage/**',
			'examples/**/styleguide/**',
			'examples/**/node_modules/**',
			'site/**',
			'**/__snapshots__/**',
			'.eslintcache',
		],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	// Classic JSX runtime (tsconfig `jsx: react`): `React` must be in scope in every JSX file
	react.configs.flat.recommended,
	reactHooks.configs.flat.recommended,
	jsxA11y.flatConfigs.recommended,
	importX.flatConfigs.recommended,
	importX.flatConfigs.typescript,
	{
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
		settings: {
			react: { version: 'detect' },
			'import-x/resolver': {
				typescript: { project: './tsconfig.json' },
				node: { extensions: ['.js', '.mjs', '.cjs', '.ts', '.tsx', '.json'] },
			},
		},
		rules: {
			// Style rules inherited from the old tamia config that still make sense.
			curly: ['error', 'all'],
			eqeqeq: ['error', 'allow-null'],
			'no-console': 'warn',
			'no-var': 'error',
			'prefer-const': 'error',
			'object-shorthand': ['error', 'always'],
			// Relative imports must carry an explicit extension: the compiled Node side runs as native ESM.
			'import-x/extensions': ['error', 'ignorePackages', { ts: 'never', tsx: 'never' }],
			// `export * from` of modules that only export TypeScript types confuses this rule
			'import-x/export': 'off',
			'import-x/no-duplicates': 'error',
			'import-x/newline-after-import': 'error',
			'import-x/first': 'error',
			'import-x/no-unresolved': 'off',
			'import-x/named': 'off',
			'import-x/default': 'off',
			'import-x/namespace': 'off',
			'import-x/no-named-as-default': 'off',
			'import-x/no-named-as-default-member': 'off',
			// Styleguidist components deliberately keep runtime PropTypes for JS users.
			'react/prop-types': 'off',
			'react/display-name': 'off',
			'react/no-unknown-property': ['error', { ignore: ['isolate'] }],
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{ argsIgnorePattern: '^_', ignoreRestSiblings: true },
			],
			'@typescript-eslint/no-require-imports': 'off',
			'@typescript-eslint/ban-ts-comment': 'off',
			'@typescript-eslint/no-empty-object-type': 'off',
			'@typescript-eslint/no-unused-expressions': 'off',
		},
	},
	{
		// Node-only sources: allow console output (CLI, loggers).
		files: [
			'src/bin/**',
			'src/scripts/**',
			'scripts/**',
			'test/**',
			'examples/**/*.js',
			'*.config.*',
		],
		rules: {
			'no-console': 'off',
		},
	},
	{
		files: ['**/*.spec.*', '**/__tests__/**', '**/__mocks__/**', 'test/**'],
		languageOptions: {
			globals: {
				...globals.vitest,
				classes: 'readonly',
			},
		},
		rules: {
			'react/jsx-key': 'off',
			'react-hooks/rules-of-hooks': 'off',
		},
	},
	{
		// Examples are user-land code compiled by Vite, which resolves extensionless imports
		files: ['examples/**'],
		rules: {
			'import-x/extensions': 'off',
		},
	}
);
