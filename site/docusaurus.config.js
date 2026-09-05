// Docusaurus 3 configuration for the Vite Styleguidist docs site.
//
// The site is published to GitHub Pages of the vite-styleguidist organization by
// .github/workflows/site.yml, so `url` + `baseUrl` below must match the project-pages
// address <org>.github.io/<repo>/. If the site ever moves to a custom domain, change
// `url`, set `baseUrl` to '/', and add a `static/CNAME` file.
//
// Kept as CommonJS on purpose: `remark.js` and `scripts/docs.js` are CommonJS too, and
// Docusaurus loads all of them through `require`. Switching the site to ESM is possible
// but buys nothing today.

const { themes } = require('prism-react-renderer');

const REPO_URL = 'https://github.com/vite-styleguidist/vite-styleguidist';

module.exports = {
	title: 'Vite Styleguidist',
	tagline:
		'Isolated React component development environment with a living style guide, powered by Vite',
	url: 'https://vite-styleguidist.github.io',
	baseUrl: '/vite-styleguidist/',
	// GitHub Pages serves `foo/index.html` for `/foo/` but redirects `/foo` -> `/foo/`
	// itself; emitting trailing slashes avoids that extra redirect on every deep link.
	trailingSlash: true,
	// TODO(branding): this favicon is still the original React Styleguidist mark by
	// Andrey Okonetchnikov and Sara Vieira. Replace it once the fork has its own icon.
	favicon: 'img/favicon.ico',
	organizationName: 'vite-styleguidist',
	projectName: 'vite-styleguidist',

	// Docusaurus 3 defaults to 'throw' for broken internal links; keep it explicit so a
	// renamed doc id or a stale sidebar entry fails the build instead of shipping a 404.
	onBrokenLinks: 'throw',

	// The landing page and headings use Bree Serif; body text uses Open Sans.
	stylesheets: ['https://fonts.googleapis.com/css?family=Bree+Serif|Open+Sans:400,400i,700'],

	// Local, build-time search index. Replaces the upstream Algolia DocSearch index, which
	// was provisioned for react-styleguidist.js.org and cannot be reused by this fork.
	// If the fork is accepted into the DocSearch program later, swap this theme for the
	// `themeConfig.algolia` block again.
	themes: [
		[
			'@easyops-cn/docusaurus-search-local',
			{
				hashed: true,
				indexBlog: false,
				docsRouteBasePath: '/docs',
				highlightSearchTermsOnTargetPage: true,
			},
		],
	],

	plugins: [
		[
			'@docusaurus/plugin-client-redirects',
			{
				redirects: [
					// The webpack configuration page became the Vite page in 1.0; keep old
					// bookmarks and inbound links working.
					{ from: '/docs/webpack', to: '/docs/vite' },
				],
			},
		],
	],

	presets: [
		[
			'@docusaurus/preset-classic',
			{
				docs: {
					// `docs/` here is site/docs, generated from the repo-root docs/ folder by
					// `npm run sync`. See scripts/docs.js for the conventions.
					sidebarPath: require.resolve('./sidebars.js'),
					// `before…` so that relative `Foo.md#anchor` links are already `/docs/<id>#anchor`
					// when Docusaurus's own Markdown-link resolver runs; otherwise it looks for a
					// `Foo.md` file in site/docs (the generated file is `<id>.md`), fails, and logs a
					// warning for every cross-doc link.
					beforeDefaultRemarkPlugins: require('./remark'),
				},
				// No blog: the changelog lives in GitHub Releases.
				blog: false,
				theme: {
					customCss: require.resolve('./src/css/custom.css'),
				},
			},
		],
	],

	themeConfig: {
		colorMode: {
			// The custom palette in src/css/custom.css only has a light variant.
			disableSwitch: true,
			respectPrefersColorScheme: false,
		},
		prism: {
			theme: themes.nightOwlLight,
		},
		navbar: {
			hideOnScroll: false,
			title: 'Vite Styleguidist',
			items: [
				{
					to: 'docs/getting-started',
					activeBasePath: 'docs',
					label: 'Docs',
					position: 'right',
				},
				{
					to: 'learn',
					activeBasePath: 'learn',
					label: 'Learn',
					position: 'right',
				},
				{
					href: REPO_URL,
					label: 'GitHub',
					position: 'right',
				},
			],
		},
		footer: {
			links: [
				{
					title: 'Project',
					items: [
						{
							label: 'Changelog',
							href: `${REPO_URL}/releases`,
						},
						{
							label: 'Code of conduct',
							href: `${REPO_URL}/blob/main/.github/CODE_OF_CONDUCT.md`,
						},
					],
				},
				{
					title: 'Community',
					items: [
						{
							label: 'GitHub',
							href: REPO_URL,
						},
						{
							label: 'Discussions',
							href: `${REPO_URL}/discussions`,
						},
					],
				},
			],
			copyright:
				'Vite Styleguidist is a maintained fork of React Styleguidist, created by Artem Sapegin and contributors. Original logo by Andrey Okonetchnikov and Sara Vieira. Not affiliated with or endorsed by the original maintainers.',
		},
	},
};
