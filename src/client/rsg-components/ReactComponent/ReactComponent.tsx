import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Examples from 'rsg-components/Examples';
import SectionHeading from 'rsg-components/SectionHeading';
import JsDoc from 'rsg-components/JsDoc';
import Markdown from 'rsg-components/Markdown';
import Slot from 'rsg-components/Slot';
import ReactComponentRenderer from 'rsg-components/ReactComponent/ReactComponentRenderer';
import Context, { StyleGuideContextContents } from 'rsg-components/Context';
import ExamplePlaceholderDefault from 'rsg-components/ExamplePlaceholder';
import {
	DOCS_ROOT_MARGIN,
	applyLoadedDocs,
	getLoadedDocs,
	loadComponentDocs,
	markSelfManaged,
	subscribeToComponent,
} from '../../utils/componentDocs.js';
import { getOriginId } from '../../utils/handleHash.js';
import { DOCS_TAB_USAGE } from '../slots/index.js';
import { DisplayModes, UsageModes } from '../../consts.js';
import type * as Rsg from '../../../typings/index.js';

const ExamplePlaceholder =
	process.env.STYLEGUIDIST_ENV !== 'production' ? ExamplePlaceholderDefault : () => <div />;

// Defined with the store (componentDocs.ts) so that the safety net behind a replaced
// renderer can watch the viewport by the same rule without importing this module; re-exported
// because this is where it has always been part of the public surface.
export { DOCS_ROOT_MARGIN } from '../../utils/componentDocs.js';

interface ReactComponentProps {
	component: Rsg.Component;
	depth: number;
	exampleMode?: string;
	usageMode?: string;
}

interface ReactComponentState {
	activeTab?: string;
}

export default class ReactComponent extends Component<ReactComponentProps, ReactComponentState> {
	public static propTypes = {
		component: PropTypes.object.isRequired,
		depth: PropTypes.number.isRequired,
		exampleMode: PropTypes.string.isRequired,
		usageMode: PropTypes.string.isRequired,
	};

	public static contextType = Context;

	public state = {
		activeTab: this.props.usageMode === UsageModes.expand ? DOCS_TAB_USAGE : undefined,
	};

	/** Watches the component’s heading, so that its documentation loads as it comes into view. */
	private observer: IntersectionObserver | undefined;
	private unsubscribeFromDocs: (() => void) | undefined;
	/**
	 * Told to the store while this component is mounted, so that the safety net behind a
	 * replaced renderer (DocsAutoloader) leaves this component alone: everything below is
	 * exactly the loading it would otherwise have to do.
	 */
	private releaseSelfManaged: (() => void) | undefined;

	public componentDidMount() {
		this.startLoadingDocs();
	}

	/**
	 * The page can become this component’s own page without remounting it: following a link
	 * into the isolated view re-renders the same instance with a different display mode, and
	 * a component that was waiting for the reader to scroll to it is now the whole page.
	 */
	public componentDidUpdate() {
		const { component } = this.props;
		if (!component.loadDocs || component.docsLoaded || getLoadedDocs(component)) {
			// The documentation is here; there is nothing left to watch the viewport for
			this.stopObserving();
			return;
		}
		const { displayMode } = this.context as StyleGuideContextContents;
		const isRouteTarget = displayMode !== DisplayModes.all;
		if (isRouteTarget || this.isDeepLinkTarget()) {
			this.stopObserving();
			loadComponentDocs(component, { refreshTree: isRouteTarget });
		}
	}

	public componentWillUnmount() {
		this.stopObserving();
		if (this.unsubscribeFromDocs) {
			this.unsubscribeFromDocs();
			this.unsubscribeFromDocs = undefined;
		}
		if (this.releaseSelfManaged) {
			this.releaseSelfManaged();
			this.releaseSelfManaged = undefined;
		}
	}

	private stopObserving() {
		if (this.observer) {
			this.observer.disconnect();
			this.observer = undefined;
		}
	}

	/**
	 * Arrange for this component’s documentation to be there when it is needed.
	 *
	 * Right away when the page *is* this component — an isolated view, a single section, a
	 * single example, or the element a deep link points at — and when it comes near the
	 * viewport otherwise. Also right away when there is nothing to watch: a browser without
	 * IntersectionObserver, or a replaced `ReactComponent` that renders no anchor of its
	 * own. Loading too early only costs bytes; never loading would lose the documentation.
	 */
	private startLoadingDocs() {
		const { component } = this.props;
		if (!component.loadDocs || component.docsLoaded) {
			return;
		}
		const { displayMode } = this.context as StyleGuideContextContents;

		// Everything below is this component looking after itself; say so, so that the
		// safety net does not load it as well (see DocsAutoloader)
		this.releaseSelfManaged = markSelfManaged(component);

		// Re-render this component (and only this one) when its documentation arrives
		this.unsubscribeFromDocs = subscribeToComponent(component, () => this.forceUpdate());

		const isRouteTarget = displayMode !== DisplayModes.all;
		const load = () =>
			loadComponentDocs(component, {
				// A page built from the documentation itself (an isolated example is picked by
				// index out of a list that is empty until the load) has to be routed again
				refreshTree: isRouteTarget,
			});

		if (isRouteTarget || this.isDeepLinkTarget()) {
			load();
			return;
		}

		const element = component.slug ? document.getElementById(component.slug) : null;
		/* istanbul ignore if: jsdom has no IntersectionObserver, so the specs take this path */
		if (!element || typeof IntersectionObserver === 'undefined') {
			load();
			return;
		}
		// Kept until the documentation has actually arrived (componentDidUpdate above), not
		// dropped as soon as a load is started: a load that fails leaves the component empty,
		// and scrolling past it again is the retry ADR 0019 promises. An observer whose
		// element is still intersecting fires no second time, so this costs nothing.
		this.observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					load();
				}
			},
			{ rootMargin: DOCS_ROOT_MARGIN }
		);
		this.observer.observe(element);
	}

	/** Is the address pointing at this component? Then it is what the reader came for. */
	private isDeepLinkTarget(): boolean {
		/* istanbul ignore next: `window` is always there in the browser and in jsdom */
		const hash = typeof window === 'undefined' ? '' : window.location.hash;
		const id = getOriginId(hash);
		return !!id && id === this.props.component.slug;
	}

	private handleTabChange = (name: string) => {
		this.setState((state) => ({
			activeTab: state.activeTab !== name ? name : undefined,
		}));
	};

	public render() {
		const { activeTab } = this.state;
		const {
			displayMode,
			config: { pagePerSection },
		} = this.context as StyleGuideContextContents;
		const { depth, usageMode, exampleMode } = this.props;
		// The tree was processed before this component’s documentation arrived; the store
		// may have it by now (see componentDocs.ts)
		const component = applyLoadedDocs(this.props.component);
		const { name, visibleName, slug = '-', filepath, pathLine, href } = component;
		const { description = '', examples = [], tags = {} } = component.props || {};
		if (!name) {
			return null;
		}
		const showUsage = usageMode !== UsageModes.hide;
		// A component whose documentation is still on its way has no examples *yet*, which is
		// not the same thing as having none: the “write a Readme.md” placeholder would be a
		// lie, and an empty block is what the container is until the answer arrives.
		const docsPending = component.loadDocs && !component.docsLoaded;

		return (
			<ReactComponentRenderer
				name={name}
				slug={slug}
				filepath={filepath}
				pathLine={pathLine}
				docs={<JsDoc {...tags} />}
				description={description && <Markdown text={description} />}
				heading={
					<SectionHeading
						id={slug}
						pagePerSection={pagePerSection}
						deprecated={!!tags.deprecated}
						slotName="componentToolbar"
						slotProps={{
							...component,
							isolated: displayMode !== DisplayModes.all,
						}}
						href={href}
						depth={depth}
						// The component name keeps the outline level its nesting gives it, but is
						// always drawn at the page-title size (40px, 32 below mq.small) the
						// artboards specify: a Button documented three sections deep should not
						// read as a sub-sub-heading (ADR 0011)
						size={1}
					>
						{visibleName}
					</SectionHeading>
				}
				examples={
					examples.length > 0 ? (
						<Examples examples={examples} name={name} exampleMode={exampleMode} depth={depth} />
					) : docsPending ? null : (
						<ExamplePlaceholder name={name} />
					)
				}
				tabButtons={
					showUsage && (
						<Slot
							name="docsTabButtons"
							active={activeTab}
							props={{ ...component, onClick: this.handleTabChange }}
						/>
					)
				}
				tabBody={<Slot name="docsTabs" active={activeTab} onlyActive props={component} />}
			/>
		);
	}
}
