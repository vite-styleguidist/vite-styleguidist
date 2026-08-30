import React from 'react';
import { render } from '@testing-library/react';
import Markdown from './Markdown.js';

describe('Markdown', () => {
	// Markdown output combines many Styled renderers; a DOM snapshot is the most readable
	// way to pin the whole structure (tags, generated ids, JSS class names) at once.
	const expectSnapshotToMatch = (markdown: string) => {
		const { container } = render(<Markdown text={markdown} />);

		expect(container.firstChild).toMatchSnapshot();
	};

	it('should forward DOM attributes onto resulting HTML', () => {
		const markdown =
			'<a href="test.com" id="preserve-my-id" class="preserve-my-class">Something</a>';

		const { getByRole } = render(<Markdown text={markdown} />);

		expect(getByRole('link').getAttribute('id')).toEqual('preserve-my-id');
		expect(getByRole('link').className).toContain('preserve-my-class');
	});

	it('should render links', () => {
		expectSnapshotToMatch('a [link](http://test.com)');
	});

	it('should render headings with generated ids', () => {
		expectSnapshotToMatch(`
# one
## two
### three
#### four
##### five
###### six
`);
	});

	it('should render paragraphs', () => {
		expectSnapshotToMatch(`
a paragraph

another paragraph
		`);
	});

	it('should render emphasis and strong text', () => {
		expectSnapshotToMatch(`
this text is **strong**

and this is _emphasized_
		`);
	});

	it('should render unordered lists', () => {
		expectSnapshotToMatch(`
* list
* item
* three
`);
	});

	it('should render ordered lists', () => {
		expectSnapshotToMatch(`
1. list
1. item
1. three
`);
	});

	it('should render mixed nested lists', () => {
		expectSnapshotToMatch(`
* list 1
* list 2
  1. Sub-list
  1. Sub-list
  1. Sub-list
* list 3
`);
	});

	it('should render check-lists', () => {
		const { container, getAllByRole } = render(
			<Markdown
				text={`
* [ ] to do 1
* [ ] to do 2
* [x] to do 3
`}
			/>
		);

		const checkboxes = getAllByRole('checkbox') as HTMLInputElement[];
		expect(checkboxes.map((checkbox) => checkbox.checked)).toEqual([false, false, true]);
		// Task list checkboxes are informational only
		expect(checkboxes.every((checkbox) => checkbox.readOnly)).toBe(true);
		expect(container.firstChild).toMatchSnapshot();
	});

	it('should render a blockquote', () => {
		expectSnapshotToMatch(`
> This is a blockquote.
> And this is a second line.
`);
	});

	it('should render pre-formatted text', () => {
		expectSnapshotToMatch(`
    this is preformatted
    so is this
`);
	});

	it('should render code blocks without escaping', () => {
		const { container } = render(
			<Markdown
				text={`
\`\`\`html
<foo></foo>
\`\`\`
`}
			/>
		);

		// Fenced code is pre-highlighted HTML (see the loaders), so it must be injected as is
		expect(container.querySelector('pre foo')).not.toBeNull();
		expect(container.firstChild).toMatchSnapshot();
	});

	it('should render inline code with escaping', () => {
		const { container, getByText } = render(<Markdown text="Foo `<bar>` baz" />);

		expect(getByText('<bar>').tagName).toBe('CODE');
		expect(container.firstChild).toMatchSnapshot();
	});

	it('should render a horizontal rule', () => {
		expectSnapshotToMatch(`---`);
	});

	it('should render a table', () => {
		expectSnapshotToMatch(`
| heading 1 | heading 2 |
| --------- | --------- |
| foo		| bar		|
| more foo	| more bar	|
`);
	});

	it('should ignore single line comments', () => {
		const markdown = `Hello World
<!-- This is a single line comment -->
`;
		const { queryByText } = render(<Markdown text={markdown} />);

		expect(queryByText('This is a single line comment')).toBe(null);
	});

	it('should ignore multiline comments', () => {
		const markdown = `Hello World
<!--
This is a
multiline
comment
-->
`;
		const { queryByText } = render(<Markdown text={markdown} />);

		expect(
			queryByText(`This is a
multiline
comment`)
		).toBe(null);
	});
});

describe('Markdown inline', () => {
	it('should render text in a span', () => {
		const { container } = render(<Markdown text="Hello world!" inline />);

		const span = container.firstChild as HTMLElement;
		expect(span.tagName).toBe('SPAN');
		expect(span).toHaveTextContent('Hello world!');
		expect(container.querySelector('p')).toBeNull();
	});
});
