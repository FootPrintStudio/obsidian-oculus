import assert from "node:assert/strict";
import test from "node:test";

const { applyGallerySort } = await import("../.test-build/gallerySort.mjs");

test("sorts by name and date", () => {
	const items = [
		{ id: "b", name: "bravo.png", mtime: 200, mediaKind: "image", source: "local", src: "" },
		{ id: "a", name: "alpha.png", mtime: 100, mediaKind: "image", source: "local", src: "" },
		{ id: "c", name: "charlie.png", mtime: 300, mediaKind: "image", source: "local", src: "" },
	];

	applyGallerySort(items, "name-asc");
	assert.deepEqual(
		items.map((i) => i.name),
		["alpha.png", "bravo.png", "charlie.png"],
	);

	applyGallerySort(items, "date-dsc");
	assert.deepEqual(
		items.map((i) => i.name),
		["charlie.png", "bravo.png", "alpha.png"],
	);
});

test("random sort preserves length", () => {
	const items = [
		{ id: "1", name: "a", mediaKind: "image", source: "local", src: "" },
		{ id: "2", name: "b", mediaKind: "image", source: "local", src: "" },
		{ id: "3", name: "c", mediaKind: "image", source: "local", src: "" },
	];
	applyGallerySort(items, "random");
	assert.equal(items.length, 3);
	assert.equal(new Set(items.map((i) => i.id)).size, 3);
});
