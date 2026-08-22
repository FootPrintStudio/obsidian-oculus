import type { GalleryItem, GallerySortMode } from "./types";

function compareName(a: GalleryItem, b: GalleryItem): number {
	return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

function compareDate(a: GalleryItem, b: GalleryItem, ascending: boolean): number {
	const am = a.mtime;
	const bm = b.mtime;
	const aMissing = am == null;
	const bMissing = bm == null;
	if (aMissing && bMissing) return compareName(a, b);
	if (aMissing) return 1;
	if (bMissing) return -1;
	const diff = (am as number) - (bm as number);
	if (diff !== 0) return ascending ? diff : -diff;
	return compareName(a, b);
}

function shuffleInPlace(items: GalleryItem[]): void {
	for (let i = items.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const tmp = items[i]!;
		items[i] = items[j]!;
		items[j] = tmp;
	}
}

/** Mutates and returns `items` when a sort mode is set. */
export function applyGallerySort(items: GalleryItem[], sort: GallerySortMode | null): GalleryItem[] {
	if (!sort) return items;
	if (sort === "random") {
		shuffleInPlace(items);
		return items;
	}
	if (sort === "name-asc") {
		items.sort(compareName);
		return items;
	}
	if (sort === "name-dsc") {
		items.sort((a, b) => -compareName(a, b));
		return items;
	}
	if (sort === "date-asc") {
		items.sort((a, b) => compareDate(a, b, true));
		return items;
	}
	items.sort((a, b) => compareDate(a, b, false));
	return items;
}
