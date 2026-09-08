import React from 'react';
import { render } from '@testing-library/react';
import JsDoc, { getMarkdown } from './JsDoc.js';

const tags = {
	deprecated: [
		{
			title: 'description',
			description: 'Use *another* method',
		},
	],
	version: [
		{
			title: 'version',
			description: '2.0.0',
		},
	],
	since: [
		{
			title: 'since',
			description: '1.0.0',
		},
	],
	author: [
		{
			title: 'author',
			description: '[Author 1](#TestLink)',
		},
		{
			title: 'author',
			description: '[Author 2](#TestLink2)',
		},
	],
	see: [
		{
			title: 'see',
			description: '[See 1](#TestLink)',
		},
		{
			title: 'see',
			description: '[See 2](#TestLink2)',
		},
	],
	link: [
		{
			title: 'link',
			description: '[Link 1](#TestLink)',
		},
	],
};

describe('getMarkdown', () => {
	it('should return Markdown for all tags', () => {
		const result = getMarkdown(tags);
		expect(result).toBe(
			[
				'**Deprecated:** Use *another* method',
				'[See 1](#TestLink)',
				'[See 2](#TestLink2)',
				'[Link 1](#TestLink)',
				'**Authors:** [Author 1](#TestLink), [Author 2](#TestLink2)',
				'**Version:** 2.0.0',
				'**Since:** 1.0.0',
			].join('\n\n')
		);
	});

	it('should return Markdown for one author', () => {
		const author = tags.author ? [tags.author[0]] : undefined;
		const result = getMarkdown({
			author,
		});
		expect(result).toBe('**Author:** [Author 1](#TestLink)');
	});

	it('should return Markdown for multiple authors', () => {
		const result = getMarkdown({
			author: tags.author,
		});
		expect(result).toBe('**Authors:** [Author 1](#TestLink), [Author 2](#TestLink2)');
	});
});

describe('JsDoc', () => {
	it('should render Markdown', () => {
		const { container, getByText, getAllByRole } = render(<JsDoc {...tags} />);

		expect(getByText('Deprecated:').tagName).toBe('STRONG');
		expect(getByText('Since:').tagName).toBe('STRONG');
		expect(getByText('another').tagName).toBe('EM');
		expect(container).toHaveTextContent('Deprecated: Use another method');
		expect(container).toHaveTextContent('Authors: Author 1, Author 2');
		expect(container).toHaveTextContent('Version: 2.0.0');
		expect(container).toHaveTextContent('Since: 1.0.0');
		expect(
			getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')])
		).toEqual([
			['See 1', '#TestLink'],
			['See 2', '#TestLink2'],
			['Link 1', '#TestLink'],
			['Author 1', '#TestLink'],
			['Author 2', '#TestLink2'],
		]);
	});

	it('should render null for empty tags', () => {
		const { container } = render(<JsDoc />);

		expect(container).toBeEmptyDOMElement();
	});
});
