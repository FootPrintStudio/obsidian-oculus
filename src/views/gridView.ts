import type { Component } from "obsidian";
import { resolveGridColumns } from "../layout/columnOptions";
import type { GalleryItem, MediaGallerySettings } from "../types";
import { createMediaTile } from "./renderGallery";

export function renderGrid(
	container: HTMLElement,
	items: GalleryItem[],
	settings: MediaGallerySettings,
	gridColumns: string,
	onOpen: (index: number) => void,
	component: Component,
): void {
	const grid = container.createDiv({ cls: "mg-view mg-view-grid" });
	grid.style.setProperty("--mg-grid-columns", resolveGridColumns(gridColumns));
	items.forEach((item, index) => createMediaTile(grid, item, settings, onOpen, index, component));
}
