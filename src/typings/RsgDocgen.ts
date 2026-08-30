/**
 * Styleguidist-specific extensions of react-docgen's documentation types.
 *
 * react-docgen (>= 6) ships its own types, but Styleguidist enriches the parsed
 * documentation on the Node side (see src/loaders/utils/getProps.ts): every prop
 * gets a `name` (props are turned into an array so they can be sorted) and JSDoc
 * tags parsed with doctrine (`tags`). These are the shapes the client renders.
 */
import type { Tag, Type } from 'doctrine';
import type {
	Documentation,
	PropDescriptor as DocgenPropDescriptor,
	PropTypeDescriptor as DocgenPropTypeDescriptor,
	TypeDescriptor as DocgenTypeDescriptor,
	MethodParameter,
	MethodReturn,
} from 'react-docgen';
import type { MethodDescriptor as DocgenMethodDescriptor } from 'react-docgen/dist/Documentation.js';

export type { Documentation, MethodParameter, MethodReturn };

export interface TagObject extends Omit<Tag, 'description'> {
	description?: string | null;
}

export interface TagParamObject extends TagObject {
	name: string;
	type?: Type | null;
	default?: string;
}

/** JSDoc tags grouped by title (`@deprecated`, `@see`, `@param`, ...). */
export interface TagProps {
	deprecated?: TagObject[];
	see?: TagObject[];
	link?: TagObject[];
	author?: TagObject[];
	version?: TagObject[];
	since?: TagObject[];
	returns?: TagParamObject[];
	return?: TagParamObject[];
	arg?: TagParamObject[];
	argument?: TagParamObject[];
	param?: TagParamObject[];
	[title: string]: TagObject[] | undefined;
}

// react-docgen types `value` as `unknown`; the client code inspects it heavily
// (enum/union/shape values), so we widen it to `any` on our side.
export interface PropTypeDescriptor extends Omit<DocgenPropTypeDescriptor, 'value'> {
	value?: any;
}

export type TypeDescriptor = DocgenTypeDescriptor;

export interface PropDescriptor extends Omit<DocgenPropDescriptor, 'type' | 'defaultValue'> {
	/** Added by Styleguidist: the prop name (props are stored as an array on the client). */
	name: string;
	type?: PropTypeDescriptor;
	/** Added by Styleguidist: JSDoc tags found in the prop description. */
	tags?: TagProps;
	defaultValue?: { value: any; computed?: boolean } | null;
}

/** A method parameter: react-docgen’s data merged with the `@param` JSDoc tag. */
export interface MethodParameterDescriptor
	extends
		Omit<MethodParameter, 'description' | 'type'>,
		Partial<Omit<TagParamObject, 'name' | 'type' | 'description'>> {
	name: string;
	description?: string | null;
	type?: any;
}

export interface MethodDescriptor extends Omit<DocgenMethodDescriptor, 'params' | 'returns'> {
	params?: MethodParameterDescriptor[];
	returns?: (Partial<Omit<MethodReturn, 'type'>> & Partial<TagParamObject> & { type?: any }) | null;
	/** Added by Styleguidist: JSDoc tags found in the method docblock. */
	tags?: TagProps;
}

/** A react-docgen documentation object extended with JSDoc tags. */
export interface DocumentationObject extends Omit<Documentation, 'methods' | 'props'> {
	methods?: MethodDescriptor[];
	props?: Record<string, PropDescriptor>;
	tags?: TagProps;
}
