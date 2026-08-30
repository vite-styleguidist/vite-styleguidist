import highlightCodeInMarkdown from '../highlightCodeInMarkdown.js';

it('should highlight code with specified language', () => {
	const text = `
The only true button.

\`\`\`html
<p>Hello React</p>
\`\`\`
`;
	const actual = highlightCodeInMarkdown(text);
	expect(actual).toContain('<span class="token tag">');
	expect(actual).toMatchSnapshot();
});

it('should not highlight code without language', () => {
	const text = `
The only \`true\` button.

\`\`\`
<p>Hello React</p>
\`\`\`
`;
	const actual = highlightCodeInMarkdown(text);
	expect(actual).toContain('<p>Hello React</p>');
	expect(actual).not.toContain('token');
	expect(actual).toMatchSnapshot();
});

it('should re-emit indented code blocks as fenced code blocks', () => {
	// remark >= 13 stringifies language-less code blocks as fences; the code itself is untouched
	const actual = highlightCodeInMarkdown('Text\n\n    <p>Hello React</p>\n');
	expect(actual).toBe('Text\n\n```\n<p>Hello React</p>\n```\n');
});
