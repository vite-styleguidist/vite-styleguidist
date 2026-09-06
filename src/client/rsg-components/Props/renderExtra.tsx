import React from 'react';
import Group from 'react-group';
import Type from 'rsg-components/Type';
import Code from 'rsg-components/Code';
import Name from 'rsg-components/Name';
import Markdown from 'rsg-components/Markdown';
import type { PropTypeDescriptor } from '../../../typings/index.js';

import { unquote, getType, showSpaces, PropDescriptor, TypeDescriptor } from './util.js';
import renderDefault from './renderDefault.js';
import { renderType } from './renderType.js';

// A `value` that is not a list is a computed expression (`PropTypes.oneOf(list)`) and is
// shown as is; TypeScript and Flow unions carry `elements` instead and have no `value`,
// and returning null keeps renderDescription from wrapping nothing in a paragraph
function renderPlainValue(type: PropTypeDescriptor | TypeDescriptor): React.ReactNode {
	return type.value ? <span>{type.value}</span> : null;
}

function renderEnum(type: PropTypeDescriptor | TypeDescriptor): React.ReactNode {
	if (!Array.isArray(type.value)) {
		return renderPlainValue(type);
	}

	// Literal values read as types in the description: monospace in the type colour, with
	// the <code> element kept for its semantics
	const values = type.value.map(({ value }) => (
		<Type key={value}>
			<Code>{showSpaces(unquote(value))}</Code>
		</Type>
	));
	return (
		<span>
			One of: <Group separator=", ">{values}</Group>
		</span>
	);
}

function renderUnion(type: PropTypeDescriptor | TypeDescriptor): React.ReactNode {
	if (!Array.isArray(type.value)) {
		return renderPlainValue(type);
	}

	const values = type.value.map((value, index) => (
		<Type key={`${value.name}-${index}`}>{renderType(value)}</Type>
	));
	return (
		<span>
			One of type: <Group separator=", ">{values}</Group>
		</span>
	);
}

function renderShape(props: Record<string, PropDescriptor>) {
	return Object.keys(props).map((name) => {
		const prop = props[name];
		const defaultValue = renderDefault(prop);
		const description = prop.description;
		return (
			<div key={name}>
				<Name>{name}</Name>
				{': '}
				<Type>{renderType(prop)}</Type>
				{defaultValue && ' — '}
				{defaultValue}
				{description && ' — '}
				{description && <Markdown text={description} inline />}
			</div>
		);
	});
}

export default function renderExtra(prop: PropDescriptor): React.ReactNode {
	const type = getType(prop);
	if (!type) {
		return null;
	}
	switch (type.name) {
		case 'enum':
			return renderEnum(type);
		case 'union':
			return renderUnion(type);
		case 'shape':
			return prop.type && renderShape(prop.type.value);
		case 'exact':
			return prop.type && renderShape(prop.type.value);
		case 'arrayOf':
			if (type.value.name === 'shape' || type.value.name === 'exact') {
				return prop.type && renderShape(prop.type.value.value);
			}
			return null;
		case 'objectOf':
			if (type.value.name === 'shape' || type.value.name === 'exact') {
				return prop.type && renderShape(prop.type.value.value);
			}
			return null;
		default:
			return null;
	}
}
