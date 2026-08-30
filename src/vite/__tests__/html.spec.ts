import renderHtml, { defaultTemplate } from '../html.js';
import type { TemplateContext } from '../html.js';
import type * as Rsg from '../../typings/index.js';

const baseContext: TemplateContext = {
	publicPath: './',
	lang: 'en',
	title: 'Pizza Style Guide',
	container: 'rsg-root',
	js: ['build/bundle.abc123.js'],
	css: [],
};

describe('defaultTemplate', () => {
	it('should render a minimal page', () => {
		const html = defaultTemplate(baseContext);
		expect(html).toMatch('<!DOCTYPE html>');
		expect(html).toMatch('<html lang="en">');
		expect(html).toMatch('<meta charset="utf-8">');
		expect(html).toMatch('<title>Pizza Style Guide</title>');
		expect(html).toMatch('<div id="rsg-root"></div>');
		expect(html).toMatch('<script type="module" src="./build/bundle.abc123.js"></script>');
		expect(html).not.toMatch('stylesheet');
		expect(html).not.toMatch('rel="icon"');
	});

	it('should prefix assets with the public path', () => {
		const html = defaultTemplate({
			...baseContext,
			publicPath: './',
			js: ['a.js', 'b.js'],
			css: ['style.css'],
		});
		expect(html).toMatch('<link rel="stylesheet" href="./style.css">');
		expect(html).toMatch('<script type="module" src="./a.js"></script>');
		expect(html).toMatch('<script type="module" src="./b.js"></script>');
	});

	it('should render the favicon', () => {
		const html = defaultTemplate({ ...baseContext, favicon: 'favicon.ico' });
		expect(html).toMatch('<link rel="icon" type="image/x-icon" href="favicon.ico">');
	});

	it('should render head extras', () => {
		const html = defaultTemplate({
			...baseContext,
			head: {
				meta: [{ name: 'description', content: 'Pizza' }],
				links: [{ rel: 'stylesheet', href: 'fonts.css' }],
				style: [{ media: 'print' }],
				scripts: [{ src: 'analytics.js', async: true }],
				raw: ['<!-- raw head 1 -->', '<!-- raw head 2 -->'],
			},
		});
		expect(html).toMatch('<meta name="description" content="Pizza">');
		expect(html).toMatch('<link rel="stylesheet" href="fonts.css">');
		expect(html).toMatch('<style media="print"></style>');
		expect(html).toMatch('<script src="analytics.js" async></script>');
		expect(html).toMatch('<!-- raw head 1 -->\n<!-- raw head 2 -->');
	});

	it('should render body extras before the bundle', () => {
		const html = defaultTemplate({
			...baseContext,
			body: {
				raw: '<div id="modal"></div>',
				scripts: [{ src: 'body.js' }],
			},
		});
		const container = html.indexOf('<div id="rsg-root">');
		const raw = html.indexOf('<div id="modal"></div>');
		const script = html.indexOf('<script src="body.js"></script>');
		const bundle = html.indexOf('build/bundle.abc123.js');
		expect(container).toBeGreaterThan(-1);
		expect(raw).toBeGreaterThan(container);
		expect(script).toBeGreaterThan(raw);
		expect(bundle).toBeGreaterThan(script);
	});

	it('should add attributes to the bundle tags', () => {
		const html = defaultTemplate({
			...baseContext,
			css: ['style.css'],
			attrs: {
				js: { defer: true, crossorigin: 'anonymous', nonce: undefined },
				css: { media: 'all', disabled: false },
			},
		});
		expect(html).toMatch(
			'<script type="module" src="./build/bundle.abc123.js" defer crossorigin="anonymous"></script>'
		);
		expect(html).toMatch('<link rel="stylesheet" href="./style.css" media="all">');
	});

	it('should collapse blank lines left by empty sections', () => {
		expect(defaultTemplate(baseContext)).not.toMatch(/\n\n/);
	});

	it('should strip all whitespace between tags with trimWhitespace', () => {
		const html = defaultTemplate({ ...baseContext, trimWhitespace: true });
		expect(html).not.toMatch('\n');
		expect(html).toMatch('<head><meta charset="utf-8">');
	});
});

describe('renderHtml', () => {
	const config = {
		title: 'Pizza Style Guide',
		mountPointId: 'pizza',
		template: {},
	} as Rsg.SanitizedStyleguidistConfig;
	const assets = { publicPath: './', js: ['bundle.js'], css: ['style.css'] };

	it('should render the default template with the config title and mount point', () => {
		const html = renderHtml(config, assets);
		expect(html).toMatch('<title>Pizza Style Guide</title>');
		expect(html).toMatch('<div id="pizza"></div>');
		expect(html).toMatch('<script type="module" src="./bundle.js"></script>');
		expect(html).toMatch('<link rel="stylesheet" href="./style.css">');
	});

	it('should pass a template object to the default template', () => {
		const html = renderHtml(
			{ ...config, template: { lang: 'fr', favicon: 'favicon.ico' } } as any,
			assets
		);
		expect(html).toMatch('<html lang="fr">');
		expect(html).toMatch('href="favicon.ico"');
	});

	it('should call a template function with the full context', () => {
		const template = vi.fn((context: TemplateContext) => `<title>${context.title}</title>`);
		const html = renderHtml({ ...config, template } as any, assets);
		expect(html).toBe('<title>Pizza Style Guide</title>');
		expect(template).toHaveBeenCalledWith({
			lang: 'en',
			title: 'Pizza Style Guide',
			container: 'pizza',
			publicPath: './',
			js: ['bundle.js'],
			css: ['style.css'],
		});
	});
});
