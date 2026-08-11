import type { Component } from "obsidian";
import type { GalleryItem, MediaGallerySettings } from "../types";
import { createMediaTile } from "./renderGallery";

export function renderGrid(
	container: HTMLElement,
	items: GalleryItem[],
	settings: MediaGallerySettings,
	onOpen: (index: number) => void,
	_component: Component,
): void {
	const grid = container.createDiv({ cls: "mg-view mg-view-grid" });
	if (settings.gridColumns !== "auto") {
		grid.style.setProperty("--mg-grid-columns", settings.gridColumns);
	}
	items.forEach((item, index) => createMediaTile(grid, item, settings, onOpen, index));
}
