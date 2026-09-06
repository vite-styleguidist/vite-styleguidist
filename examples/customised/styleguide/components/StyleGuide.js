import React from 'react';
import PropTypes from 'prop-types';
import Logo from 'rsg-components/Logo';
import Markdown from 'rsg-components/Markdown';
import Styled from 'rsg-components/Styled';

const xsmall = '@media (max-width: 600px)';

// Theme keys are grouped (`color.*`, `fontFamily.*`), see src/client/styles/theme.ts
const styles = ({ fontFamily, color, mq }) => ({
	root: {
		color: color.base,
		backgroundColor: color.baseBackground,
	},
	header: {
		color: '#fff',
		backgroundColor: color.link,
	},
	bar: {
		display: 'flex',
		alignItems: 'center',
		[xsmall]: {
			flexDirection: 'column',
			alignItems: 'center',
		},
	},
	nav: {
		marginLeft: 'auto',
		marginRight: '-0.5em',
		[xsmall]: {
			margin: [[10, 0, 0]],
		},
	},
	headerLink: {
		'&, &:link, &:visited': {
			marginLeft: '0.5em',
			marginRight: '0.5em',
			fontFamily: fontFamily.base,
			color: '#efefef',
		},
		'&:hover, &:active': {
			color: '#fff',
			cursor: 'pointer',
		},
	},
	content: {
		maxWidth: 1000,
		padding: [[15, 30]],
		margin: [[0, 'auto']],
		[mq.small]: {
			padding: 15,
		},
		display: 'block',
	},
	components: {
		overflow: 'auto', // To prevent the pane from growing out of the screen
	},
	footer: {
		display: 'block',
		color: color.light,
		fontFamily: fontFamily.base,
		fontSize: 12,
	},
});

export function StyleGuideRenderer({ classes, title, homepageUrl, children }) {
	return (
		<div className={classes.root}>
			<header className={classes.header}>
				<div className={classes.content}>
					<div className={classes.bar}>
						<Logo>{title}</Logo>
						<nav className={classes.nav}>
							<a
								className={classes.headerLink}
								href="https://github.com/vite-styleguidist/vite-styleguidist/blob/main/docs/Readme.md"
							>
								Docs
							</a>
							<a
								className={classes.headerLink}
								href="https://github.com/vite-styleguidist/vite-styleguidist"
							>
								GitHub
							</a>
							<a className={classes.headerLink} href="https://github.com/vite-styleguidist/vite-styleguidist/discussions">
								Discussions
							</a>
						</nav>
					</div>
				</div>
			</header>
			<main className={classes.content}>
				{children}
				<footer className={classes.footer}>
					<Markdown text={`Created with [Vite Styleguidist](${homepageUrl}) ❤️`} />
				</footer>
			</main>
		</div>
	);
}

StyleGuideRenderer.propTypes = {
	classes: PropTypes.object.isRequired,
	title: PropTypes.string.isRequired,
	homepageUrl: PropTypes.string.isRequired,
	children: PropTypes.node.isRequired,
};

export default Styled(styles)(StyleGuideRenderer);
