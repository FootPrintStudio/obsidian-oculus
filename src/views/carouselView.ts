import type { Component } from "obsidian";
import type { GalleryItem, MediaGallerySettings } from "../types";
import { createMediaTile } from "./renderGallery";

export function renderCarousel(
	container: HTMLElement,
	items: GalleryItem[],
	settings: MediaGallerySettings,
	onOpen: (index: number) => void,
	_component: Component,
): void {
	const wrap = container.createDiv({ cls: "mg-view mg-view-carousel" });
	const track = wrap.createDiv({ cls: "mg-carousel-track" });
	let activeIndex = 0;

	const controls = wrap.createDiv({ cls: "mg-carousel-controls" });
	const prevBtn = controls.createEl("button", { text: "←", cls: "mg-carousel-btn" });
	const indicator = controls.createSpan({ cls: "mg-carousel-indicator" });
	const nextBtn = controls.createEl("button", { text: "→", cls: "mg-carousel-btn" });

	const renderSlide = (): void => {
		track.empty();
		const item = items[activeIndex];
		if (!item) return;
		createMediaTile(track, item, settings, onOpen, activeIndex);
		indicator.textContent = `${activeIndex + 1} / ${items.length}`;
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
