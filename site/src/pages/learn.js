import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { Stack } from '../components/Stack';
import { List } from '../components/List';

const REPO_URL = 'https://github.com/vite-styleguidist/vite-styleguidist';

// Third-party learning material. All of it was written about the original React
// Styleguidist, which Vite Styleguidist is a maintained fork of; the concepts and the
// configuration are the same, only the bundler underneath changed. Check the links are
// still alive before each release.
const sections = [
	{
		title: 'Articles',
		links: [
			{
				title: 'Front-End Documentation, Style Guides and the Rise of MDX',
				href: 'https://css-tricks.com/front-end-documentation-style-guides-and-the-rise-of-mdx/',
			},
			{
				title: 'How to Visualise Your Components with React Styleguidist',
				href: 'https://medium.com/simply/3-react-styleguidist-c7f67830f40a',
			},
			{
				title: 'React Components Living Style Guides Overview',
				href: 'https://nearform.com/insights/react-components-living-style-guides-overview/',
			},
			{
				title: 'Storybook vs Styleguidist: A comparison of the top UI component explorers',
				href: 'https://www.chromatic.com/blog/storybook-vs-styleguidist/',
			},
		],
	},
	{
		title: 'Talks',
		links: [
			{
				title: 'Using React Styleguidist The Wrong Way by Bogdan Kolbik',
				href: 'https://youtu.be/2J0WtYfPc-A',
			},
			{
				title: 'Scalable Design Systems with TypeScript by Tejas Kumar',
				href: 'https://youtu.be/ZsBW4S8hYMU',
			},
			{
				title: 'The Dream of Styleguide Driven Development by Sara Vieira',
				href: 'https://youtu.be/JjXnmhNW8Cs',
			},
		],
	},
];

const EditIcon = () => (
	<svg
		fill="currentColor"
		height="1.2em"
		width="1.2em"
		preserveAspectRatio="xMidYMid meet"
		viewBox="0 0 40 40"
		style={{
			marginRight: '0.3em',
			verticalAlign: 'sub',
		}}
	>
		<g>
			<path d="m34.5 11.7l-3 3.1-6.3-6.3 3.1-3q0.5-0.5 1.2-0.5t1.1 0.5l3.9 3.9q0.5 0.4 0.5 1.1t-0.5 1.2z m-29.5 17.1l18.4-18.5 6.3 6.3-18.4 18.4h-6.3v-6.2z" />
		</g>
	</svg>
);

function Learn() {
	return (
		<Layout
			title="Learn Vite Styleguidist"
			description="Talks, articles and other learning resources about Vite Styleguidist and React Styleguidist"
		>
			<Stack gap="l" className="container padding-vert--lg">
				<Stack gap="m" as="header">
					<h1>Learn Vite Styleguidist</h1>
					<p>
						Vite Styleguidist is a maintained fork of React Styleguidist, and the two share the same
						concepts and configuration. The articles and talks below were made about the original
						project by its creators and the community; everything they teach still applies. Start
						with the <Link to="/docs/getting-started">Getting started</Link> guide if you are new to
						either.
					</p>
				</Stack>
				{sections.map((section) => (
					<Stack key={section.title} gap="m" as="section">
						<h2>{section.title}</h2>
						<List>
							{section.links.map((link) => (
								<li key={link.href}>
									<Link href={link.href} target="_blank" rel="noopener noreferrer">
										{link.title}
									</Link>
								</li>
							))}
						</List>
					</Stack>
				))}
				<p>
					<Link
						href={`${REPO_URL}/edit/main/site/src/pages/learn.js`}
						target="_blank"
						rel="noopener noreferrer"
					>
						<EditIcon />
						Edit this page
					</Link>
				</p>
			</Stack>
		</Layout>
	);
}

export default Learn;
