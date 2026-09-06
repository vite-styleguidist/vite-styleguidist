import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import ThemeToggle from './ThemeToggle.js';
import Context from '../Context/index.js';
import {
	COLOR_SCHEME_ATTRIBUTE,
	COLOR_SCHEME_CONFIG_ATTRIBUTE,
	COLOR_SCHEME_STORAGE_KEY,
} from '../../styles/colorSchemes.js';
import type * as Rsg from '../../../typings/index.js';

const root = document.documentElement;

const renderToggle = (config: Partial<Rsg.ProcessedStyleguidistConfig> = {}) =>
	render(
		<Context.Provider
			value={{
				codeRevision: 0,
				cssRevision: '0',
				config: config as Rsg.ProcessedStyleguidistConfig,
				slots: {},
				displayMode: 'all',
			}}
		>
			<ThemeToggle />
		</Context.Provider>
	);

afterEach(() => {
	root.removeAttribute(COLOR_SCHEME_ATTRIBUTE);
	root.removeAttribute(COLOR_SCHEME_CONFIG_ATTRIBUTE);
	window.localStorage.clear();
	vi.restoreAllMocks();
});

test('should render system, light and dark buttons with system pressed by default', () => {
	const { getAllByRole, getByRole } = renderToggle();
	expect(getAllByRole('button').map((button) => button.textContent)).toEqual([
		'System',
		'Light',
		'Dark',
	]);
	expect(getByRole('button', { name: 'System' })).toHaveAttribute('aria-pressed', 'true');
	expect(root).not.toHaveAttribute(COLOR_SCHEME_ATTRIBUTE);
});

test('should apply and store the chosen scheme', () => {
	const { getByRole } = renderToggle();
	fireEvent.click(getByRole('button', { name: 'Dark' }));
	expect(root).toHaveAttribute(COLOR_SCHEME_ATTRIBUTE, 'dark');
	expect(window.localStorage.getItem(COLOR_SCHEME_STORAGE_KEY)).toBe('dark');
	expect(getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true');
	expect(getByRole('button', { name: 'System' })).toHaveAttribute('aria-pressed', 'false');

	fireEvent.click(getByRole('button', { name: 'System' }));
	expect(root).not.toHaveAttribute(COLOR_SCHEME_ATTRIBUTE);
	expect(window.localStorage.getItem(COLOR_SCHEME_STORAGE_KEY)).toBe('system');
});

test('should start from the stored choice', () => {
	window.localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, 'light');
	const { getByRole } = renderToggle();
	expect(getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'true');
	expect(root).toHaveAttribute(COLOR_SCHEME_ATTRIBUTE, 'light');
});

test('should start from the scheme already applied to <html> when nothing is stored', () => {
	// What the inline script leaves behind for a config default of "dark" is covered
	// by the forced case; here a custom template applied an attribute by itself
	root.setAttribute(COLOR_SCHEME_ATTRIBUTE, 'dark');
	const { getByRole } = renderToggle();
	expect(getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true');
});

test('should ignore garbage in storage', () => {
	window.localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, 'sepia');
	const { getByRole } = renderToggle();
	expect(getByRole('button', { name: 'System' })).toHaveAttribute('aria-pressed', 'true');
});

test('should work when storage throws', () => {
	vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
		throw new Error('SecurityError');
	});
	vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
		throw new Error('SecurityError');
	});
	const { getByRole } = renderToggle();
	fireEvent.click(getByRole('button', { name: 'Dark' }));
	expect(root).toHaveAttribute(COLOR_SCHEME_ATTRIBUTE, 'dark');
});

test('should render nothing and apply the scheme when the config forces one', () => {
	window.localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, 'light');
	const { container } = renderToggle({ colorScheme: 'dark' });
	expect(container).toBeEmptyDOMElement();
	// A forced scheme beats a choice stored before the maintainer forced it
	expect(root).toHaveAttribute(COLOR_SCHEME_ATTRIBUTE, 'dark');
});

test('should read a forced scheme from <html> when the config does not reach the client', () => {
	root.setAttribute(COLOR_SCHEME_CONFIG_ATTRIBUTE, 'light');
	const { container } = renderToggle();
	expect(container).toBeEmptyDOMElement();
	expect(root).toHaveAttribute(COLOR_SCHEME_ATTRIBUTE, 'light');
});
