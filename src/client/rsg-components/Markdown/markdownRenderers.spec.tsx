import { baseOverrides, inlineOverrides } from './Markdown.js';
import markdownRenderers from './markdownRenderers.js';

// The extraction that lets `Markdown.tsx` and `MdxPage/mdxComponents.tsx` share one element
// map must not have changed what markdown-to-jsx is given: the `.md` output is snapshotted in
// Markdown.spec.tsx, and these assertions pin the map itself.
describe('markdownRenderers', () => {
	it('should be the map Markdown renders documents with', () => {
		expect(baseOverrides).toBe(markdownRenderers);
	});

	it('should be given to markdown-to-jsx in the overrides shape it expects', () => {
		for (const [element, renderer] of Object.entries(markdownRenderers)) {
			expect(typeof renderer.component, element).toBe('function');
			if (renderer.props) {
				expect(typeof renderer.props, element).toBe('object');
			}
		}
	});

	it('should cover the elements a Markdown document can produce', () => {
		expect(Object.keys(markdownRenderers)).toEqual([
			'a',
			'h1',
			'h2',
			'h3',
			'h4',
			'h5',
			'h6',
			'p',
			'em',
			'strong',
			'ul',
			'ol',
			'blockquote',
			'code',
			'pre',
			'input',
			'hr',
			'img',
			'table',
			'thead',
			'th',
			'tbody',
			'tr',
			'td',
			'details',
			'summary',
		]);
	});

	it('should keep the inline variant a copy with its own paragraph renderer', () => {
		expect(inlineOverrides).not.toBe(markdownRenderers);
		expect(inlineOverrides.p).not.toBe(markdownRenderers.p);
		expect(inlineOverrides.a).toBe(markdownRenderers.a);
	});
});
