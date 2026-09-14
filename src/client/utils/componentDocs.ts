/**
 * On-demand component documentation: the browser side of the `lazyDocs` option
 * (docs/decisions/0019-on-demand-documentation.md).
 *
 * With `lazyDocs` on, the style guide module carries only what the guide can know about a
 * component without parsing it — its file, its slug, its path line, whether it has
 * examples, and the name derived from its file path. Its documentation (props, methods,
 * description, examples) and its own module sit behind `component.loadDocs()`, a function
 * that `import()`s them.
 *
 * This module is where the answers land. It is a plain module-level store rather than a
 * React context or a Suspense cache on purpose:
 *
 * - the section tree is rebuilt outside React on every render (renderStyleguide), so the
 *   merge has to be callable from plain functions (processComponents) as well as from
 *   components;
 * - the React floor is 16.14 (ADR 0013): `useSyncExternalStore` does not exist there, and
 *   Suspense would replace the containers the sidebar, the scroll spy and the deep links
 *   need with a fallback.
 *
 * Two kinds of update come out of it. A component that gets its documentation re-renders
 * *itself* (`subscribeToComponent`), which is what keeps scrolling through a large guide
 * from re-rendering every playground on the page. The whole guide is re-rendered
 * (`subscribeToTree`) only when the tree itself would come out different: a route that
 * depends on the documentation (an isolated view filtered by example index), or the rare
 * component whose documented name is not the one its file path suggested.
 */
import type * as Rsg from '../../typings/index.js';

/**
 * How far below the fold a component’s documentation starts loading (`lazyDocs`, ADR 0019).
 *
 * Generous downwards, nothing upwards, and that asymmetry is deliberate. Loading a
 * component fills its container, which pushes everything after it down; doing that *above*
 * the viewport would move the page under the reader, and would move a deep link’s target
 * away from where the browser has just scrolled to. A component that is only partly
 * visible still intersects, so nothing on screen is left empty by the missing top margin.
 */
export const DOCS_ROOT_MARGIN = '0px 0px 1200px 0px';

/**
 * Components are keyed by their file, not by their slug: the same component can be listed
 * in two sections (two slugs, one file) and its documentation is the same in both.
 */
const docsKey = (component: Rsg.Component): string =>
	component.filepath || component.slug || component.nameFromPath || '';

interface DocsEntry {
	/** In flight; `undefined` once it has settled, so a failed load can be retried. */
	promise?: Promise<void>;
	docs?: Rsg.ComponentDocs;
	module?: unknown;
	/** The last attempt failed. Kept so a hot update knows there is something to retry. */
	failed?: boolean;
	/**
	 * Why the last attempt failed, in the browser’s own words. Set together with `failed`
	 * and cleared by the next load that succeeds; it is what the component renders in place
	 * of its body instead of staying blank for good (see DocsLoading).
	 */
	error?: string;
}

const entries = new Map<string, DocsEntry>();
const componentListeners = new Map<string, Set<() => void>>();
const treeListeners = new Set<() => void>();
/** Told whenever any load settles, successfully or not; see subscribeToLoads. */
const loadListeners = new Set<() => void>();

/**
 * Components whose documentation something has taken responsibility for loading, and how
 * many mounted things are doing so (a component listed in two sections is rendered twice).
 *
 * Styleguidist’s own `ReactComponent` is one of those things: it knows the display mode, it
 * has the component’s anchor and it watches the viewport. A replaced `ReactComponent`,
 * `Components` or `Sections` (`styleguideComponents`) knows none of that and has no reason
 * to call `loadDocs` at all — so the guide would render empty containers for ever. This is
 * how the safety net that catches those (DocsAutoloader) tells the two apart, instead of
 * loading everything and undoing the whole point of the option.
 */
const selfManaged = new Map<string, number>();

/** “I will load this component’s documentation myself.” Returns the release. */
export function markSelfManaged(component: Rsg.Component): () => void {
	const key = docsKey(component);
	selfManaged.set(key, (selfManaged.get(key) || 0) + 1);
	let released = false;
	return () => {
		if (released) {
			return;
		}
		released = true;
		const left = (selfManaged.get(key) || 1) - 1;
		if (left > 0) {
			selfManaged.set(key, left);
		} else {
			selfManaged.delete(key);
		}
	};
}

/** Is something already looking after this component’s documentation? */
export function isSelfManaged(component: Rsg.Component): boolean {
	return (selfManaged.get(docsKey(component)) || 0) > 0;
}

/** The documentation of a component if it has been loaded. */
export function getLoadedDocs(component: Rsg.Component): Rsg.ComponentDocs | undefined {
	return entries.get(docsKey(component))?.docs;
}

/** The component’s own module (`component.module`) if it has been loaded. */
export function getLoadedModule(component: Rsg.Component): unknown {
	return entries.get(docsKey(component))?.module;
}

/**
 * Why this component’s documentation is not here, if the last attempt to fetch it failed.
 *
 * Cleared by a later attempt that succeeds, so it is “the state right now” rather than a
 * log: a component that failed once and loaded on the second approach has none.
 */
export function getDocsError(component: Rsg.Component): string | undefined {
	return entries.get(docsKey(component))?.error;
}

function notifyComponent(key: string): void {
	componentListeners.get(key)?.forEach((listener) => listener());
}

/**
 * Told that a load has settled — with its documentation or with an error.
 *
 * Not a re-render hook: it is how something outside React can wait for the page to stop
 * growing. The deep links use it (src/client/utils/deepLinks.ts), because the height of the
 * document is a function of how much documentation has arrived, and the element a link
 * points at moves every time a component above it fills in.
 */
export function subscribeToLoads(listener: () => void): () => void {
	loadListeners.add(listener);
	return () => {
		loadListeners.delete(listener);
	};
}

function notifyLoad(): void {
	loadListeners.forEach((listener) => listener());
}

/**
 * Whole-guide re-renders are coalesced into one per frame: several components can get
 * their documentation in the same batch of `import()`s, and each of them rebuilding the
 * section tree would be the cost this whole feature exists to avoid.
 */
let treeUpdateScheduled = false;
function notifyTree(): void {
	if (treeUpdateScheduled || treeListeners.size === 0) {
		return;
	}
	treeUpdateScheduled = true;
	const flush = () => {
		treeUpdateScheduled = false;
		treeListeners.forEach((listener) => listener());
	};
	/* istanbul ignore next: jsdom in the specs has no requestAnimationFrame */
	if (typeof requestAnimationFrame === 'function') {
		requestAnimationFrame(flush);
	} else {
		setTimeout(flush, 0);
	}
}

/**
 * Does this documentation disagree with the name the file path suggested? Then the tree
 * the sidebar and the routes were built from is out of date and has to be rebuilt.
 */
function identityChanged(component: Rsg.Component, docs: Rsg.ComponentDocs): boolean {
	const name = component.nameFromPath;
	return (
		!!name &&
		((!!docs.displayName && docs.displayName !== name) ||
			(!!docs.visibleName && docs.visibleName !== name))
	);
}

export interface LoadOptions {
	/**
	 * Re-render the whole guide when the documentation arrives, not just the component.
	 * Set by pages whose *content* is chosen from the documentation — an isolated view of
	 * one example (`#!/Button/1`) filters the examples of a component that has none until
	 * it is loaded.
	 */
	refreshTree?: boolean;
}

/**
 * Start loading a component’s documentation, unless it is already loaded or on its way.
 * Safe to call as often as it is convenient: it is what makes a double-mounted component
 * (StrictMode, a re-run effect) load once.
 */
export function loadComponentDocs(
	component: Rsg.Component,
	{ refreshTree = false }: LoadOptions = {}
): void {
	const loader = component.loadDocs;
	if (!loader) {
		return;
	}
	const key = docsKey(component);
	const existing = entries.get(key);
	if (existing && (existing.docs || existing.promise)) {
		return;
	}
	const entry: DocsEntry = existing || {};
	entries.set(key, entry);
	entry.promise = loader().then(
		(loaded) => {
			entry.promise = undefined;
			entry.failed = false;
			entry.error = undefined;
			entry.docs = (loaded && loaded.props) || {};
			entry.module = loaded && loaded.module;
			notifyComponent(key);
			if (refreshTree || identityChanged(component, entry.docs)) {
				notifyTree();
			}
			notifyLoad();
		},
		(error) => {
			// The entry is left empty so that the next trigger (the reader scrolling past
			// the component again, a hot update) tries once more
			entry.promise = undefined;
			entry.failed = true;
			entry.error = error instanceof Error ? error.message : String(error);
			// eslint-disable-next-line no-console
			console.error(
				`Cannot load the documentation of ${component.nameFromPath || key}:`,
				error
			);
			// The component is told about a failure exactly as it is told about an answer:
			// it has something to render either way, and a container that stays blank for
			// good is what this replaces (ADR 0019, DocsLoading)
			notifyComponent(key);
			// Whatever was waiting for the page to settle should stop waiting for this one
			notifyLoad();
		}
	);
}

/** Every component of a section tree, depth first. */
export function eachComponent(sections: Rsg.Section[], callback: (component: Rsg.Component) => void): void {
	sections.forEach((section) => {
		(section.components || []).forEach(callback);
		eachComponent(section.sections || [], callback);
	});
}

/**
 * Load everything that is still on demand.
 *
 * The safety net behind the file-path names: a route is matched against a component’s
 * name, and a component whose documented `displayName` is not what its file is called has
 * neither name in the tree until it is loaded. A link to such a component would render
 * “not found” forever, so the page that has nothing to show loads the rest of the guide
 * once and looks again (StyleGuide). A genuine 404 finds nothing left to load and stops.
 */
export function loadAllComponentDocs(sections: Rsg.Section[]): void {
	eachComponent(sections, (component) => loadComponentDocs(component, { refreshTree: true }));
}

/**
 * Re-import the documentation that is already on the page, after a hot update replaced the
 * style guide module.
 *
 * Without this the store would answer with the documentation of the previous version of a
 * component forever: the loaders in the new module are new functions pointing at new URLs,
 * but the entries are keyed by file. Only what has been loaded is re-imported — the rest
 * stays on demand — and the old answer keeps rendering until the new one arrives, so a
 * save does not blank the page.
 */
export function refreshLoadedDocs(sections: Rsg.Section[]): void {
	const inFlight: Promise<unknown>[] = [];
	eachComponent(sections, (component) => {
		const key = docsKey(component);
		const entry = entries.get(key);
		// A load that failed is retried here as well as re-imported: the loaders of the new
		// module point at new URLs, which is the one retry that can succeed after a network
		// failure — a browser remembers a module whose fetch failed and refuses to fetch the
		// same URL again (see ADR 0019)
		if (entry && entry.failed && component.loadDocs) {
			loadComponentDocs(component, { refreshTree: true });
			return;
		}
		if (!entry || !entry.docs || !component.loadDocs) {
			return;
		}
		inFlight.push(
			component.loadDocs().then((loaded) => {
				entry.docs = (loaded && loaded.props) || {};
				entry.module = loaded && loaded.module;
				notifyComponent(key);
			})
		);
	});
	if (inFlight.length > 0) {
		// The tree is rebuilt once at the end: a hot update can change a documented name
		Promise.all(inFlight).then(() => {
			notifyTree();
			notifyLoad();
		}, () => undefined);
	}
}

/** Re-render one component when its documentation arrives. Returns the unsubscribe. */
export function subscribeToComponent(component: Rsg.Component, listener: () => void): () => void {
	const key = docsKey(component);
	const listeners = componentListeners.get(key) || new Set<() => void>();
	componentListeners.set(key, listeners);
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
		if (listeners.size === 0) {
			componentListeners.delete(key);
		}
	};
}

/** Re-render the whole guide when the section tree would come out different. */
export function subscribeToTree(listener: () => void): () => void {
	treeListeners.add(listener);
	return () => {
		treeListeners.delete(listener);
	};
}

/**
 * The documentation a component renders from until its own arrives: no description, no
 * props, no examples, and the name its file path gave it. It is a real object rather than
 * `undefined` so that a replaced `ReactComponent` (`styleguideComponents`) written against
 * `component.props` keeps working and simply renders an empty component; `docsLoaded` is
 * how the default renderer tells the two apart.
 */
export function placeholderDocs(name?: string): Rsg.ComponentDocs {
	return {
		displayName: name,
		visibleName: name,
		description: '',
		methods: [],
		props: [],
		tags: {},
		examples: [],
	};
}

/** A component of the section tree with the documentation it was given. */
export function withDocs(
	component: Rsg.Component,
	docs: Rsg.ComponentDocs,
	module?: unknown
): Rsg.Component {
	return {
		...component,
		// Add .name shortcuts for names instead of .props.displayName.
		name: docs.displayName || component.nameFromPath,
		visibleName: docs.visibleName || docs.displayName || component.nameFromPath,
		props: {
			...docs,
			// Append @example doclet to all examples
			examples: [...(docs.examples || []), ...(docs.example || [])],
		},
		module: module !== undefined ? module : component.module,
		docsLoaded: true,
		// An answer clears a failure the same component may have carried from an earlier
		// attempt (the store cleared its own copy; this is the one on the tree’s object)
		docsError: undefined,
	};
}

/** A component of the section tree that has no documentation yet. */
export function withPlaceholderDocs(component: Rsg.Component): Rsg.Component {
	return {
		...component,
		name: component.nameFromPath,
		visibleName: component.nameFromPath,
		props: placeholderDocs(component.nameFromPath),
		docsLoaded: false,
		// Alongside `docsLoaded: false`, so that a replaced `ReactComponent` can tell “not
		// here yet” from “not coming” without reaching into this module
		docsError: getDocsError(component),
	};
}

/**
 * The same component, with its documentation if the store has it by now.
 *
 * The section tree is processed once per render of the whole guide, but a component gets
 * its documentation between two of those: this is how it renders the answer without
 * waiting for the next full render (see ReactComponent).
 */
export function applyLoadedDocs(component: Rsg.Component): Rsg.Component {
	if (component.docsLoaded || !component.loadDocs) {
		return component;
	}
	const entry = entries.get(docsKey(component));
	if (entry && entry.docs) {
		return withDocs(component, entry.docs, entry.module);
	}
	// A load that failed since the tree was processed: the message rides on the component
	// object the way `docsLoaded` does, so everything that renders one can see it
	const error = entry && entry.error;
	return error === component.docsError ? component : { ...component, docsError: error };
}

/** Forget everything. Only for tests: the store lives as long as the page does. */
export function resetComponentDocs(): void {
	entries.clear();
	componentListeners.clear();
	treeListeners.clear();
	loadListeners.clear();
	selfManaged.clear();
	treeUpdateScheduled = false;
}
