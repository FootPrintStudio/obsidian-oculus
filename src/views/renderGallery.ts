import { App, Component, Notice } from "obsidian";
import { isMediaExtendedAvailable, tryOpenVideoInMediaExtended } from "../mediaExtended";
import type { GalleryItem, MediaGallerySettings, ParsedGalleryBlock } from "../types";
import { openLightbox } from "./lightbox";
import { renderCarousel } from "./carouselView";
import { renderGrid } from "./gridView";
import { renderMasonryH } from "./masonryHView";
import { renderMasonryV } from "./masonryVView";
import { renderThumbnails } from "./thumbnailView";

export async function openGalleryItem(
	app: App,
	items: GalleryItem[],
	index: number,
	settings: MediaGallerySettings,
): Promise<void> {
	const item = items[index];
	if (!item) return;

	if (item.urlVariant === "hosted") {
		if (await tryOpenVideoInMediaExtended(app, item)) return;
		new Notice("Hosted videos require Media Extended on desktop.");
		return;
	}

	if (
		item.mediaKind === "video" &&
		settings.useMediaExtendedPlayback &&
		(await tryOpenVideoInMediaExtended(app, item))
	) {
		return;
	}
	openLightbox(app, items, index, settings);
}

export function renderGalleryView(
	app: App,
	container: HTMLElement,
	component: Component,
	viewType: ParsedGalleryBlock["view"],
	items: GalleryItem[],
	settings: MediaGallerySettings,
	parsed: ParsedGalleryBlock,
): void {
	container.empty();
	container.addClass("mg-gallery-root");
	resetDeferredMediaLoader(component);

	const onOpen = (index: number): void => {
		void openGalleryItem(app, items, index, settings);
	};

	switch (viewType) {
		case "grid":
			renderGrid(container, items, settings, parsed.gridColumns, onOpen, component);
			break;
		case "thumbnails":
			renderThumbnails(container, items, settings, parsed.thumbnailColumns, onOpen, component);
			break;
		case "carousel":
			renderCarousel(
				container,
				items,
				settings,
				parsed.carouselHeightPx,
				parsed.carouselShowThumbnails,
				onOpen,
				component,
			);
			break;
		case "masonry-h":
			renderMasonryH(
				container,
				items,
				settings,
				parsed.masonryRowHeightPx,
				onOpen,
				component,
			);
			break;
		case "masonry-v":
			renderMasonryV(
				container,
				items,
				settings,
				parsed.masonryColumnWidth,
				onOpen,
				component,
			);
			break;
	}
}

export function renderErrorPanel(container: HTMLElement, messages: string[]): void {
	container.empty();
	container.addClass("mg-gallery-error");
	for (const message of messages) {
		container.createDiv({ cls: "mg-gallery-error-line", text: message });
	}
}

export function renderWarningPanel(container: HTMLElement, messages: string[]): void {
	if (messages.length === 0) return;
	const wrap = container.createDiv({ cls: "mg-gallery-warnings" });
	for (const message of messages) {
		wrap.createDiv({ cls: "mg-gallery-warning-line", text: message });
	}
}

const NATIVE_VIEWER_EVENTS = ["click", "mousedown", "dblclick", "pointerdown"] as const;
const DEFERRED_MEDIA_ROOT_MARGIN = "600px";

interface DeferredMediaLoader {
	observer: IntersectionObserver;
}

const deferredMediaLoaders = new WeakMap<Component, DeferredMediaLoader>();

function resetDeferredMediaLoader(component: Component): void {
	deferredMediaLoaders.get(component)?.observer.disconnect();
}

function activateDeferredMedia(media: HTMLImageElement | HTMLVideoElement): void {
	const src = media.dataset.src;
	if (!src) return;
	delete media.dataset.src;

	const markLoaded = (): void => media.classList.add("mg-lazy-loaded");
	if (media instanceof HTMLImageElement) {
		media.addEventListener("load", markLoaded, { once: true });
		media.src = src;
		if (media.complete && media.naturalWidth > 0) markLoaded();
		return;
	}

	media.addEventListener("loadedmetadata", markLoaded, { once: true });
	media.src = src;
	media.preload = "metadata";
	media.load();
}

function observeDeferredMedia(
	component: Component,
	media: HTMLImageElement | HTMLVideoElement,
): void {
	media.classList.add("mg-lazy");

	if (typeof IntersectionObserver === "undefined") {
		activateDeferredMedia(media);
		return;
	}

	let loader = deferredMediaLoaders.get(component);
	if (!loader) {
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) continue;
					const target = entry.target;
					if (!(target instanceof HTMLImageElement || target instanceof HTMLVideoElement)) {
						continue;
					}
					observer.unobserve(target);
					activateDeferredMedia(target);
				}
			},
			{ rootMargin: DEFERRED_MEDIA_ROOT_MARGIN },
		);
		loader = { observer };
		deferredMediaLoaders.set(component, loader);
		component.register(() => {
			observer.disconnect();
			deferredMediaLoaders.delete(component);
		});
	}

	loader.observer.observe(media);
}

/** Stop Obsidian's built-in image viewer from opening on gallery tiles. */
function suppressNativeImageViewer(tile: HTMLElement, onOpen: () => void): void {
	tile.setAttr("role", "button");
	tile.setAttr("tabindex", "0");

	const stop = (event: Event): void => {
		event.preventDefault();
		event.stopPropagation();
		// Obsidian 1.12+ may register capture handlers on the workspace; block immediate propagation too.
		event.stopImmediatePropagation();
	};

	for (const media of Array.from(tile.querySelectorAll("img, video"))) {
		media.classList.add("mg-native-suppressed");
		for (const type of NATIVE_VIEWER_EVENTS) {
			media.addEventListener(type, stop, { capture: true });
		}
	}

	tile.addEventListener("click", (event) => {
		stop(event);
		onOpen();
	});
	tile.addEventListener("keydown", (event) => {
		if (event.key !== "Enter" && event.key !== " ") return;
		stop(event);
		onOpen();
	});
}

function attachRemoteLoadErrorHandler(tile: HTMLElement, item: GalleryItem): void {
	if (item.source !== "url" || item.urlVariant === "hosted") return;

	const media = tile.querySelector("img, video");
	if (!media) return;

	media.addEventListener(
		"error",
		() => {
			const block = tile.closest(".mg-block");
			if (!block) return;

			let panel = block.querySelector(".mg-gallery-warnings");
			if (!panel) {
				panel = block.createDiv({ cls: "mg-gallery-warnings" });
				const host = block.querySelector(".mg-gallery-host");
				if (host) block.insertBefore(panel, host);
			}

			const message = `Remote media failed to load (CORS or blocked URL): ${item.url ?? item.name}`;
			const existing = Array.from(panel.querySelectorAll(".mg-gallery-warning-line")).some(
				(el) => el.textContent === message,
			);
			if (existing) return;

			panel.createDiv({ cls: "mg-gallery-warning-line", text: message });
		},
		{ once: true },
	);
}

export function appendGalleryTileMedia(
	mediaWrap: HTMLElement,
	item: GalleryItem,
	component: Component,
): void {
	let media: HTMLImageElement | HTMLVideoElement;
	if (item.urlVariant === "hosted") {
		media = mediaWrap.createEl("img", {
			attr: {
				"data-src": item.src,
				alt: item.name,
				loading: "lazy",
				decoding: "async",
				fetchpriority: "low",
				draggable: "false",
			},
		});
		mediaWrap.createDiv({ cls: "mg-tile-play-badge", attr: { "aria-hidden": "true" } });
	} else if (item.mediaKind === "video") {
		media = mediaWrap.createEl("video", {
			attr: {
				"data-src": item.src,
				preload: "none",
				muted: "",
				playsinline: "",
			},
		});
	} else {
		media = mediaWrap.createEl("img", {
			attr: {
				"data-src": item.src,
				alt: item.name,
				loading: "lazy",
				decoding: "async",
				fetchpriority: "low",
				draggable: "false",
			},
		});
	}

	observeDeferredMedia(component, media);
}

export function createMediaTile(
	parent: HTMLElement,
	item: GalleryItem,
	settings: MediaGallerySettings,
	onOpen: (index: number) => void,
	index: number,
	component: Component,
): HTMLElement {
	const tile = parent.createDiv({ cls: "mg-tile" });
	tile.dataset.mediaKind = item.mediaKind;
	if (item.urlVariant === "hosted") tile.addClass("mg-tile-hosted");

	const mediaWrap = tile.createDiv({ cls: "mg-tile-media" });
	appendGalleryTileMedia(mediaWrap, item, component);

	suppressNativeImageViewer(tile, () => onOpen(index));
	attachRemoteLoadErrorHandler(tile, item);

	if (settings.showCaptions && item.caption) {
		const caption = tile.createDiv({ cls: "mg-tile-caption", text: item.caption });
		caption.style.setProperty("-webkit-line-clamp", String(settings.captionMaxLines));
	}

	return tile;
}
