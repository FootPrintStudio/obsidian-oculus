import type { Component } from "obsidian";
import { resolveThumbnailColumns } from "../layout/columnOptions";
import type { GalleryItem, MediaGallerySettings } from "../types";
import { createMediaTile } from "./renderGallery";

export function renderThumbnails(
	container: HTMLElement,
	items: GalleryItem[],
	settings: MediaGallerySettings,
	thumbnailColumns: string,
	onOpen: (index: number) => void,
	component: Component,
): void {
	const grid = container.createDiv({ cls: "mg-view mg-view-thumbnails" });
	grid.style.setProperty("--mg-thumb-columns", resolveThumbnailColumns(thumbnailColumns));
	items.forEach((item, index) => createMediaTile(grid, item, settings, onOpen, index, component));
}
