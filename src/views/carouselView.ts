import type { Component } from "obsidian";
import { resolveCarouselHeightPx } from "../parseBlock";
import type { GalleryItem, MediaGallerySettings } from "../types";
import { createMediaTile } from "./renderGallery";

export function renderCarousel(
	container: HTMLElement,
	items: GalleryItem[],
	settings: MediaGallerySettings,
	carouselHeightPx: number | null,
	showThumbnails: boolean,
	onOpen: (index: number) => void,
	_component: Component,
): void {
	const wrap = container.createDiv({ cls: "mg-view mg-view-carousel" });
	const height = resolveCarouselHeightPx(carouselHeightPx);
	wrap.style.setProperty("--mg-carousel-height", `${height}px`);
	if (showThumbnails) wrap.addClass("mg-view-carousel-has-thumbs");

	const track = wrap.createDiv({ cls: "mg-carousel-track" });
	const thumbStrip = showThumbnails ? wrap.createDiv({ cls: "mg-carousel-thumbs" }) : null;
	const controls = wrap.createDiv({ cls: "mg-carousel-controls" });
	const prevBtn = controls.createEl("button", { text: "←", cls: "mg-carousel-btn" });
	const indicator = controls.createSpan({ cls: "mg-carousel-indicator" });
	const nextBtn = controls.createEl("button", { text: "→", cls: "mg-carousel-btn" });

	let activeIndex = 0;

	const syncThumbs = (): void => {
		if (!thumbStrip) return;
		thumbStrip.empty();
		items.forEach((item, index) => {
			const thumb = thumbStrip.createDiv({
				cls: `mg-carousel-thumb${index === activeIndex ? " is-active" : ""}`,
				attr: { role: "button", tabindex: "0", "aria-label": item.name },
			});
			if (item.mediaKind === "video") {
				thumb.createEl("video", {
					attr: { src: item.src, preload: "metadata", muted: "", playsinline: "" },
				});
			} else {
				thumb.createEl("img", {
					attr: { src: item.src, alt: item.name, loading: "lazy", draggable: "false" },
				});
			}
			const select = (): void => {
				activeIndex = index;
				renderSlide();
			};
			thumb.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				select();
			});
			thumb.addEventListener("keydown", (event) => {
				if (event.key !== "Enter" && event.key !== " ") return;
				event.preventDefault();
				select();
			});
		});
	};

	const renderSlide = (): void => {
		track.empty();
		const item = items[activeIndex];
		if (!item) return;
		createMediaTile(track, item, settings, onOpen, activeIndex);
		indicator.textContent = `${activeIndex + 1} / ${items.length}`;
		syncThumbs();
	};

	prevBtn.addEventListener("click", () => {
		activeIndex = (activeIndex - 1 + items.length) % items.length;
		renderSlide();
	});
	nextBtn.addEventListener("click", () => {
		activeIndex = (activeIndex + 1) % items.length;
		renderSlide();
	});

	renderSlide();
}
