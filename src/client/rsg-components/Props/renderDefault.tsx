import React from 'react';
import Text from 'rsg-components/Text';
import PropDefault from './PropDefaultRenderer.js';
import { showSpaces, unquote, PropDescriptor } from './util.js';

const defaultValueBlacklist = ['null', 'undefined'];

export default function renderDefault(prop: PropDescriptor): React.ReactNode {
	// Workaround for issue https://github.com/reactjs/react-docgen/issues/221
	// If prop has defaultValue it can not be required
	if (prop.defaultValue) {
		const defaultValueString = showSpaces(unquote(String(prop.defaultValue.value)));
		if (prop.type || prop.flowType || prop.tsType) {
			const propName = prop.type
				? prop.type.name
				: prop.flowType
					? prop.flowType.type
					: prop.tsType && prop.tsType.type;

			if (defaultValueBlacklist.indexOf(prop.defaultValue.value) > -1) {
				return <PropDefault>{defaultValueString}</PropDefault>;
			} else if (propName === 'func' || propName === 'function') {
				return (
					<PropDefault>
						<Text color="light" underlined title={defaultValueString}>
							Function
						</Text>
					</PropDefault>
				);
			} else if (propName === 'shape' || propName === 'object') {
				try {
					// We eval source code to be able to format the defaultProp here. This
					// can be considered safe, as it is the source code that is evaled,
					// which is from a known source and safe by default.
					// Indirect eval runs in the global scope (no local variables are needed)
					// and keeps bundlers from having to preserve the surrounding scope.
					const object = (0, eval)(`(${prop.defaultValue.value})`);
					return (
						<PropDefault>
							<Text color="light" underlined title={JSON.stringify(object, null, 2)}>
								Shape
							</Text>
						</PropDefault>
					);
				} catch (e) {
					// eval will throw if it contains a reference to a property not in the
					// local scope. To avoid any breakage we fall back to rendering the
					// prop without any formatting
					return (
						<PropDefault>
							<Text color="light" underlined title={prop.defaultValue.value}>
								Shape
							</Text>
						</PropDefault>
					);
				}
			}
		}

		// Plain monospace in the secondary colour (PropDefault.value): the Default column is
		// a table field, not prose, so it does not take the inline-code chip (ADR 0011 and
		// the 1.0 artboard show it unchipped)
		return <PropDefault>{defaultValueString}</PropDefault>;
	} else if (prop.required) {
		return <PropDefault required>Required</PropDefault>;
	}
	return '';
}
