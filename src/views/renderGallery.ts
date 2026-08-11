import { App, Component } from "obsidian";
import type { GalleryItem, GalleryViewType, MediaGallerySettings } from "../types";
import { openLightbox } from "./lightbox";
import { renderCarousel } from "./carouselView";
import { renderGrid } from "./gridView";
import { renderMasonryH } from "./masonryHView";
import { renderMasonryV } from "./masonryVView";
import { renderThumbnails } from "./thumbnailView";

export function renderGalleryView(
	app: App,
	container: HTMLElement,
	component: Component,
	viewType: GalleryViewType,
	items: GalleryItem[],
	settings: MediaGallerySettings,
): void {
	container.empty();
	container.addClass("mg-gallery-root");

	const onOpen = (index: number): void => {
		openLightbox(app, items, index, settings);
	};

	switch (viewType) {
		case "grid":
			renderGrid(container, items, settings, onOpen, component);
			break;
		case "thumbnails":
			renderThumbnails(container, items, settings, onOpen, component);
			break;
		case "carousel":
			renderCarousel(container, items, settings, onOpen, component);
			break;
		case "masonry-h":
			renderMasonryH(container, items, settings, onOpen, component);
			break;
		case "masonry-v":
			renderMasonryV(container, items, settings, onOpen, component);
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

function attachLazyLoad(el: HTMLElement): void {
	const media = el.querySelector("img,video");
	if (!media) return;
	media.classList.add("mg-lazy");
	const observer = new IntersectionObserver(
		(entries, obs) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				entry.target.classList.add("mg-lazy-loaded");
				obs.unobserve(entry.target);
			}
		},
		{ rootMargin: "100px" },
	);
	observer.observe(media);
	el.addEventListener("remove", () => observer.disconnect(), { once: true });
}

export function createMediaTile(
	parent: HTMLElement,
	item: GalleryItem,
	settings: MediaGallerySettings,
	onOpen: (index: number) => void,
	index: number,
): HTMLElement {
	const tile = parent.createDiv({ cls: "mg-tile" });
	tile.dataset.mediaKind = item.mediaKind;

	const mediaWrap = tile.createDiv({ cls: "mg-tile-media" });
	if (item.mediaKind === "video") {
		mediaWrap.createEl("video", {
			attr: {
				src: item.src,
				preload: "metadata",
				muted: "",
				playsinline: "",
			},
		});
	} else {
		mediaWrap.createEl("img", {
			attr: { src: item.src, alt: item.name, loading: "lazy" },
		});
	}

	tile.addEventListener("click", () => onOpen(index));
	attachLazyLoad(tile);

	if (settings.showCaptions && item.caption) {
		const caption = tile.createDiv({ cls: "mg-tile-caption", text: item.caption });
		caption.style.setProperty("-webkit-line-clamp", String(settings.captionMaxLines));
	}

	return tile;
}
