import React, { useEffect, useState } from 'react';
import ThemeToggleRenderer from 'rsg-components/ThemeToggle/ThemeToggleRenderer';
import { useStyleGuideContext } from 'rsg-components/Context';
import {
	applyScheme,
	readAppliedScheme,
	readConfiguredScheme,
	readStoredScheme,
	storeScheme,
} from './colorScheme.js';
import type * as Rsg from '../../../typings/index.js';

/**
 * System / light / dark switch for the style guide UI (ADR 0011).
 *
 * The visitor’s choice is stored in localStorage and applied to `<html>` as the
 * `data-rsg-theme` attribute the variable sheet selects on. The inline script in the
 * generated HTML applies the same choice before the first paint, so on mount the
 * component only has to read what is already there. When the `colorScheme` config
 * option forces a scheme there is nothing to choose and nothing is rendered.
 */
export default function ThemeToggle() {
	const { config } = useStyleGuideContext();
	// `colorScheme` may not be part of the config shipped to the client; the inline
	// script writes it into <html> as well, which also covers custom templates
	const configured: Rsg.ColorScheme = config.colorScheme || readConfiguredScheme();
	const forced = configured !== 'system';

	const [scheme, setScheme] = useState<Rsg.ColorScheme>(() =>
		forced ? configured : readStoredScheme() || readAppliedScheme()
	);

	useEffect(() => {
		applyScheme(scheme);
	}, [scheme]);

	if (forced) {
		return null;
	}

	const onChange = (next: Rsg.ColorScheme) => {
		storeScheme(next);
		setScheme(next);
	};

	return <ThemeToggleRenderer value={scheme} onChange={onChange} />;
}
