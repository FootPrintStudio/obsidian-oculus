import type { Component } from "obsidian";
import type { GalleryItem, MediaGallerySettings } from "../types";
import { createMediaTile } from "./renderGallery";

export function renderThumbnails(
	container: HTMLElement,
	items: GalleryItem[],
	settings: MediaGallerySettings,
	onOpen: (index: number) => void,
	_component: Component,
): void {
	const grid = container.createDiv({ cls: "mg-view mg-view-thumbnails" });
	items.forEach((item, index) => createMediaTile(grid, item, settings, onOpen, index));
}
