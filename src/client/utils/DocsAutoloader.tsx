import { Component } from 'react';
import {
	DOCS_ROOT_MARGIN,
	eachComponent,
	getLoadedDocs,
	isSelfManaged,
	loadComponentDocs,
} from './componentDocs.js';
import { getOriginId } from './handleHash.js';
import { DisplayModes } from '../consts.js';
import type * as Rsg from '../../typings/index.js';

/**
 * The safety net behind on-demand documentation (`lazyDocs`, ADR 0019 point 5).
 *
 * All of the loading lives in Styleguidist’s own `ReactComponent`, and
 * `styleguideComponents` can replace that component — or `Components`, or `Sections`,
 * which are what render it. A guide that replaces any of them therefore mounted nothing
 * that ever called `component.loadDocs()`, and every component in it kept the empty
 * placeholder documentation for good: no description, no props, no methods, no examples,
 * with a clean console and no way to tell why. The Cookbook promises the opposite (“renders
 * an empty component and then re-renders with the real one”), and so does the record.
 *
 * So the loading has to exist somewhere a replacement cannot remove. This is rendered by
 * `renderStyleguide()` — a plain function, not a replaceable component — as a **sibling
 * after** the style guide, which is what makes it safe: React commits a subtree before its
 * later siblings, so by the time `componentDidMount` runs here, every `ReactComponent` on
 * the page has mounted and said whether it is looking after itself (`markSelfManaged`).
 * With the default components that is all of them and this does nothing at all.
 *
 * What it does for the components nothing has claimed is the same rule the default
 * renderer follows, with one difference: it asks for a whole-guide re-render when the
 * answer arrives, because only `ReactComponent` subscribes to its own file and a
 * replacement would otherwise never re-render to show what was loaded.
 */
export interface DocsAutoloaderProps {
	/** The sections this page renders — not the whole guide. */
	sections: Rsg.Section[];
	displayMode?: string;
}

export default class DocsAutoloader extends Component<DocsAutoloaderProps> {
	/** One observer per component, kept so a re-render does not start a second one. */
	private observers = new Map<string, IntersectionObserver>();

	public componentDidMount() {
		this.ensureDocsWillLoad();
	}

	public componentDidUpdate() {
		this.ensureDocsWillLoad();
	}

	public componentWillUnmount() {
		this.observers.forEach((observer) => observer.disconnect());
		this.observers.clear();
	}

	private stopObserving(key: string) {
		this.observers.get(key)?.disconnect();
		this.observers.delete(key);
	}

	private ensureDocsWillLoad() {
		const { sections, displayMode = DisplayModes.all } = this.props;
		/* istanbul ignore next: `window` is always there in the browser and in jsdom */
		const hash = typeof window === 'undefined' ? '' : window.location.hash;
		const deepLinkTarget = getOriginId(hash);
		// A page that is not the all-in-one one *is* the component it shows, so there is
		// nothing to wait for — and its route may be built out of the documentation itself
		const isRouteTarget = displayMode !== DisplayModes.all;

		eachComponent(sections, (component) => {
			const key = component.filepath || component.slug || component.nameFromPath || '';
			if (!component.loadDocs || component.docsLoaded || getLoadedDocs(component)) {
				this.stopObserving(key);
				return;
			}
			if (isSelfManaged(component)) {
				return;
			}

			// The whole guide is re-rendered when this arrives: a replacement does not
			// subscribe to its own component, so nothing else would show the answer. The
			// observer is left armed on purpose — it is dropped by the branch above once the
			// documentation is really here, so a load that failed is retried when the reader
			// scrolls past the component again (ADR 0019).
			const load = () => loadComponentDocs(component, { refreshTree: true });

			if (isRouteTarget || (!!deepLinkTarget && deepLinkTarget === component.slug)) {
				load();
				return;
			}
			if (this.observers.has(key)) {
				return;
			}

			const element = component.slug ? document.getElementById(component.slug) : null;
			/* istanbul ignore if: jsdom has no IntersectionObserver, so the specs take this path */
			if (!element || typeof IntersectionObserver === 'undefined') {
				// Nothing to watch — a replacement that renders no anchor of its own, or a
				// browser without the observer. Loading too early only costs bytes; never
				// loading would lose the documentation.
				load();
				return;
			}
			const observer = new IntersectionObserver(
				(entries) => {
					if (entries.some((entry) => entry.isIntersecting)) {
						load();
					}
				},
				{ rootMargin: DOCS_ROOT_MARGIN }
			);
			this.observers.set(key, observer);
			observer.observe(element);
		});
	}

	public render() {
		return null;
	}
}
