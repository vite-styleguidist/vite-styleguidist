import React from 'react';
import { render, within } from '@testing-library/react';
import SectionHeading from './index.js';
import SectionHeadingRenderer from './SectionHeadingRenderer.js';
import Context, { StyleGuideContextContents } from '../Context/index.js';

describe('SectionHeading', () => {
	const FakeToolbar = () => <div>Fake toolbar</div>;

	test('should forward slot properties to the toolbar', () => {
		// A slot fill that echoes the props it receives from the Slot
		const Fill = ({ foo, bar }: { foo: number; bar: string }) => (
			<div>
				Fill: {foo} {bar}
			</div>
		);
		const context = {
			config: {},
			slots: { slot: [Fill] },
		} as unknown as StyleGuideContextContents;

		const { getByRole, getByText } = render(
			<Context.Provider value={context}>
				<SectionHeading
					id="section"
					slotName="slot"
					href="/#section"
					slotProps={{ foo: 1, bar: 'baz' }}
					depth={2}
				>
					A Section
				</SectionHeading>
			</Context.Provider>
		);

		expect(getByRole('heading', { level: 2, name: 'A Section' })).toHaveAttribute('id', 'section');
		expect(getByRole('link', { name: 'A Section' })).toHaveAttribute('href', '/#section');
		expect(getByText('Fill: 1 baz')).toBeInTheDocument();
	});

	test('render a section heading', () => {
		const { getByRole, getByText } = render(
			<SectionHeadingRenderer id="section" href="/section" depth={2} toolbar={<FakeToolbar />}>
				A Section
			</SectionHeadingRenderer>
		);

		const heading = getByRole('heading', { level: 2 });
		expect(heading).toHaveAttribute('id', 'section');
		const link = within(heading).getByRole('link', { name: 'A Section' });
		expect(link).toHaveAttribute('href', '/section');
		expect(link).not.toHaveAttribute('class', expect.stringContaining('rsg--isDeprecated-'));
		expect(getByText('Fake toolbar')).toBeInTheDocument();
	});

	test('render a deprecated section heading', () => {
		const { getByRole } = render(
			<SectionHeadingRenderer
				id="section"
				href="/section"
				depth={2}
				toolbar={<FakeToolbar />}
				deprecated
			>
				A Section
			</SectionHeadingRenderer>
		);

		expect(getByRole('link', { name: 'A Section' })).toHaveAttribute(
			'class',
			expect.stringContaining('rsg--isDeprecated-')
		);
	});

	test('prevent the heading level from exceeding the maximum allowed by the Heading component', () => {
		const { getByRole } = render(
			<SectionHeadingRenderer id="section" href="/section" depth={7} toolbar={<FakeToolbar />}>
				A Section
			</SectionHeadingRenderer>
		);

		expect(getByRole('heading', { level: 6, name: 'A Section' })).toBeInTheDocument();
	});
});
