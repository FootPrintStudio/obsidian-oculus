import assert from "node:assert/strict";
import test from "node:test";

const { formatMediaGalleryBlock, parseMediaGalleryBlock } = await import(
	"../.test-build/parseBlock.mjs"
);
const {
	mediaTitleMatchesQueries,
	mediaTitleMatchesQuery,
	parseMediaTitleQueries,
} = await import("../.test-build/searchQuery.mjs");

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
			queries: ["Picasso"],
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

test("parses comma-separated queries with AND semantics", () => {
	const parsed = parseMediaGalleryBlock(
		"SEARCH: Media/Art | Renaissance, Sculpture",
	);

	assert.deepEqual(parsed.errors, []);
	assert.deepEqual(parsed.entries[0]?.queries, ["Renaissance", "Sculpture"]);
});

test("rejects incomplete search entries", () => {
	const missingDelimiter = parseMediaGalleryBlock("SEARCH: Media/Art");
	const missingPath = parseMediaGalleryBlock("SEARCH: | Picasso");
	const missingQuery = parseMediaGalleryBlock("SEARCH: Media/Art |");
	const emptySegment = parseMediaGalleryBlock("SEARCH: Media/Art | Picasso, , Sculpture");

	assert.match(missingDelimiter.errors[0]?.message ?? "", /requires a title query/);
	assert.match(missingPath.errors[0]?.message ?? "", /missing a folder path/);
	assert.match(missingQuery.errors[0]?.message ?? "", /missing a title query/);
	assert.match(emptySegment.errors[0]?.message ?? "", /non-empty text values/);
});

test("formats search sources without changing LOCAL caption syntax", () => {
	const block = formatMediaGalleryBlock({
		view: "grid",
		filter: "images",
		locals: [{ path: "Media/Favorites", caption: "Selected works" }],
		searches: [
			{
				path: "Media/Art/2D",
				recursive: true,
				queries: ["Renaissance", "Sculpture"],
			},
		],
		urls: [],
	});

	assert.match(block, /LOCAL: Media\/Favorites \| Selected works/);
	assert.match(
		block,
		/SEARCH: Media\/Art\/2D recursive \| Renaissance, Sculpture/,
	);
	const reparsed = parseMediaGalleryBlock(block);
	assert.deepEqual(reparsed.errors, []);
	assert.deepEqual(reparsed.entries[1]?.queries, ["Renaissance", "Sculpture"]);
});

test("preserves builder source order across source types", () => {
	const block = formatMediaGalleryBlock({
		view: "grid",
		filter: "all",
		sources: [
			{ kind: "url", url: "https://example.com/first.jpg" },
			{ kind: "search", path: "Media/Art", queries: ["Picasso"] },
			{ kind: "local", path: "Media/last.png" },
		],
	});

	const urlIndex = block.indexOf("URL:");
	const searchIndex = block.indexOf("SEARCH:");
	const localIndex = block.indexOf("LOCAL:");
	assert.equal(urlIndex < searchIndex && searchIndex < localIndex, true);
});

test("formatter rejects empty search query arrays and segments", () => {
	const base = { view: "grid", filter: "images" };
	assert.throws(
		() =>
			formatMediaGalleryBlock({
				...base,
				sources: [{ kind: "search", path: "Media/Art", queries: [] }],
			}),
		/one or more non-empty queries/,
	);
	assert.throws(
		() =>
			formatMediaGalleryBlock({
				...base,
				sources: [{ kind: "search", path: "Media/Art", queries: ["Picasso", ""] }],
			}),
		/one or more non-empty queries/,
	);
});

test("matches normalized title substrings case-insensitively", () => {
	assert.equal(mediaTitleMatchesQuery("Pablo Picasso - Guernica", "picasso"), true);
	assert.equal(mediaTitleMatchesQuery("PICASSO-study", "Picasso"), true);
	assert.equal(mediaTitleMatchesQuery("Monet - Water Lilies", "picasso"), false);
	assert.equal(mediaTitleMatchesQuery("Picasso", "   "), false);
	assert.equal(mediaTitleMatchesQuery("Cafe\u0301 portrait", "Café"), true);
});

test("requires every parsed query to match the title", () => {
	const queries = parseMediaTitleQueries("Renaissance, Sculpture");
	assert.deepEqual(queries, ["Renaissance", "Sculpture"]);
	assert.equal(
		mediaTitleMatchesQueries("Renaissance Marble Sculpture", queries),
		true,
	);
	assert.equal(mediaTitleMatchesQueries("Renaissance Painting", queries), false);
	assert.equal(parseMediaTitleQueries("Renaissance, "), null);
});
