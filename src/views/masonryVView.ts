import type { Component } from "obsidian";
import type { GalleryItem, MediaGallerySettings } from "../types";
import { createMediaTile } from "./renderGallery";

export function renderMasonryV(
	container: HTMLElement,
	items: GalleryItem[],
	settings: MediaGallerySettings,
	onOpen: (index: number) => void,
	_component: Component,
): void {
	const wrap = container.createDiv({ cls: "mg-view mg-view-masonry-v" });
	const columnCount = Math.min(3, Math.max(1, items.length));
	const columns: HTMLElement[] = [];
	for (let i = 0; i < columnCount; i++) {
		columns.push(wrap.createDiv({ cls: "mg-masonry-col" }));
	}
	items.forEach((item, index) => {
		const col = columns[index % columnCount];
		if (col) createMediaTile(col, item, settings, onOpen, index);
	});
}
