import React from 'react';
import PropTypes from 'prop-types';
import type { TagProps, TagObject } from '../../../typings/index.js';
import map from 'lodash/map.js';
import Markdown from 'rsg-components/Markdown';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import type * as Rsg from '../../../typings/index.js';

const plural = (array: TagObject[], caption: string) =>
	array.length === 1 ? caption : `${caption}s`;
const list = (array: TagObject[]) => array.map((item) => item.description).join(', ');
const paragraphs = (array: TagObject[]) => array.map((item) => item.description).join('\n\n');

// Tag names are set in bold so they read as labels next to the light tag text
const fields = {
	deprecated: (value: TagObject[]) => `**Deprecated:** ${value[0].description}`,
	see: (value: TagObject[]) => paragraphs(value),
	link: (value: TagObject[]) => paragraphs(value),
	author: (value: TagObject[]) => `**${plural(value, 'Author')}:** ${list(value)}`,
	version: (value: TagObject[]) => `**Version:** ${value[0].description}`,
	since: (value: TagObject[]) => `**Since:** ${value[0].description}`,
};

export function getMarkdown(props: TagProps) {
	return map(fields, (format: (value: TagObject[]) => string, field: keyof TagProps) => {
		const tag = props[field];
		return tag && format(tag);
	})
		.filter(Boolean)
		.join('\n\n');
}

/**
 * JsDoc tags are secondary metadata under a description (of a component, prop or
 * method): small and light, unlike the prose they are rendered through. Para and Text
 * set their size and colour themselves, so the paragraphs and the bold tag names are
 * overridden from here rather than inherited.
 */
const styles = ({ space, color, fontSize }: Rsg.Theme) => ({
	jsDoc: {
		fontSize: fontSize.small,
		lineHeight: 1.5,
		color: color.light,
		'& p': {
			isolate: false,
			marginBottom: space[0],
			fontSize: 'inherit',
			lineHeight: 'inherit',
			color: 'inherit',
		},
		'& p:last-child': {
			isolate: false,
			marginBottom: 0,
		},
		'& strong, & em': {
			isolate: false,
			color: 'inherit',
		},
	},
});

type JsDocProps = JssInjectedProps & TagProps;

export function JsDocRenderer({ classes, ...tags }: JsDocProps) {
	const markdown = getMarkdown(tags);
	return markdown ? (
		<div className={classes.jsDoc}>
			<Markdown text={markdown} />
		</div>
	) : null;
}

JsDocRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	deprecated: PropTypes.array,
	see: PropTypes.array,
	link: PropTypes.array,
	author: PropTypes.array,
	version: PropTypes.array,
	since: PropTypes.array,
};

export default Styled<JsDocProps>(styles)(JsDocRenderer);
