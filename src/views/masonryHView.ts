import type { Component } from "obsidian";
import type { GalleryItem, MediaGallerySettings } from "../types";
import { createMediaTile } from "./renderGallery";

export function renderMasonryH(
	container: HTMLElement,
	items: GalleryItem[],
	settings: MediaGallerySettings,
	onOpen: (index: number) => void,
	_component: Component,
): void {
	const row = container.createDiv({ cls: "mg-view mg-view-masonry-h" });
	items.forEach((item, index) => createMediaTile(row, item, settings, onOpen, index));
}
