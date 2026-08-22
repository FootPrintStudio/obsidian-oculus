import { Notice } from "obsidian";
import type { GalleryItem } from "./types";

/** Filename (or display name) for drag/copy — suitable for Bases cover properties. */
export function galleryItemName(item: GalleryItem): string {
	return item.name;
}

export async function copyGalleryItemName(item: GalleryItem): Promise<void> {
	const name = galleryItemName(item);
	try {
		await navigator.clipboard.writeText(name);
		new Notice(`Copied name: ${name}`);
	} catch {
		new Notice("Could not copy name to clipboard.");
	}
}
