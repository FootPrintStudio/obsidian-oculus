import assert from "node:assert/strict";
import test from "node:test";

const { formatMediaGalleryBlock, parseMediaGalleryBlock } = await import(
	"../.test-build/parseBlock.mjs"
);
const { mediaTitleMatchesQuery } = await import("../.test-build/searchQuery.mjs");

test("parses a direct-folder title search", () => {
	const parsed = parseMediaGalleryBlock(`
OPTIONS:
VIEW: grid
FILTER: images
MEDIA:
SEARCH: Media/Art/2D | Picasso
`);

	assert.deepEqual(parsed.errors, []);
	assert.deepEqual(parsed.entries, [
		{
			kind: "search",
			path: "Media/Art/2D",
			query: "Picasso",
			recursive: false,
			line: 6,
		},
	]);
});

test("parses recursive title searches", () => {
	const explicit = parseMediaGalleryBlock("SEARCH: Media/Art recursive | blue period");
	const trailingSlash = parseMediaGalleryBlock("SEARCH: Media/Art/ | blue period");

	assert.equal(explicit.entries[0]?.kind, "search");
	assert.equal(explicit.entries[0]?.recursive, true);
	assert.equal(explicit.entries[0]?.path, "Media/Art");
	assert.equal(trailingSlash.entries[0]?.kind, "search");
	assert.equal(trailingSlash.entries[0]?.recursive, true);
	assert.equal(trailingSlash.entries[0]?.path, "Media/Art");
});

test("rejects incomplete search entries", () => {
	const missingDelimiter = parseMediaGalleryBlock("SEARCH: Media/Art");
	const missingPath = parseMediaGalleryBlock("SEARCH: | Picasso");
	const missingQuery = parseMediaGalleryBlock("SEARCH: Media/Art |");

	assert.match(missingDelimiter.errors[0]?.message ?? "", /requires a title query/);
	assert.match(missingPath.errors[0]?.message ?? "", /missing a folder path/);
	assert.match(missingQuery.errors[0]?.message ?? "", /missing a title query/);
});

test("formats search sources without changing LOCAL caption syntax", () => {
	const block = formatMediaGalleryBlock({
		view: "grid",
		filter: "images",
		locals: [{ path: "Media/Favorites", caption: "Selected works" }],
		searches: [{ path: "Media/Art/2D", recursive: true, query: "Picasso" }],
		urls: [],
	});

	assert.match(block, /LOCAL: Media\/Favorites \| Selected works/);
	assert.match(block, /SEARCH: Media\/Art\/2D recursive \| Picasso/);
});

test("preserves builder source order across source types", () => {
	const block = formatMediaGalleryBlock({
		view: "grid",
		filter: "all",
		sources: [
			{ kind: "url", url: "https://example.com/first.jpg" },
			{ kind: "search", path: "Media/Art", query: "Picasso" },
			{ kind: "local", path: "Media/last.png" },
		],
	});

	const urlIndex = block.indexOf("URL:");
	const searchIndex = block.indexOf("SEARCH:");
	const localIndex = block.indexOf("LOCAL:");
	assert.equal(urlIndex < searchIndex && searchIndex < localIndex, true);
});

test("matches normalized title substrings case-insensitively", () => {
	assert.equal(mediaTitleMatchesQuery("Pablo Picasso - Guernica", "picasso"), true);
	assert.equal(mediaTitleMatchesQuery("PICASSO-study", "Picasso"), true);
	assert.equal(mediaTitleMatchesQuery("Monet - Water Lilies", "picasso"), false);
	assert.equal(mediaTitleMatchesQuery("Picasso", "   "), false);
	assert.equal(mediaTitleMatchesQuery("Cafe\u0301 portrait", "Café"), true);
});
