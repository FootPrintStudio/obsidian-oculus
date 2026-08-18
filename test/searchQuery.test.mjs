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
VIEW: grid
FILTER: images
SEARCH: Media/Art/2D | Picasso
`);

	assert.deepEqual(parsed.errors, []);
	assert.deepEqual(parsed.entries, [
		{
			kind: "search",
			path: "Media/Art/2D",
			queries: ["Picasso"],
			recursive: false,
			line: 4,
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
		/SEARCH: Media\/Art\/2D\/ \| Renaissance, Sculpture/,
	);
	const reparsed = parseMediaGalleryBlock(block);
	assert.deepEqual(reparsed.errors, []);
	assert.deepEqual(reparsed.entries[1]?.queries, ["Renaissance", "Sculpture"]);
});

test("uses Oculus trailing-slash recursion while preserving legacy SEARCH keyword", () => {
	const formatted = formatMediaGalleryBlock({
		view: "grid",
		filter: "images",
		sources: [
			{ kind: "local", path: "Media/Local", recursive: true },
			{ kind: "search", path: "Media/Search", recursive: true, queries: ["portrait"] },
		],
	});
	assert.match(formatted, /LOCAL: Media\/Local\//);
	assert.match(formatted, /SEARCH: Media\/Search\/ \| portrait/);

	const legacyLocal = parseMediaGalleryBlock("LOCAL: Media/Local recursive");
	const legacySearch = parseMediaGalleryBlock("SEARCH: Media/Search recursive | portrait");
	assert.equal(legacyLocal.entries[0]?.recursive, false);
	assert.equal(legacySearch.entries[0]?.recursive, true);
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

test("rejects retired OPTIONS and MEDIA headers", () => {
	const parsed = parseMediaGalleryBlock(`
OPTIONS:
VIEW: grid
MEDIA:
LOCAL: Photos/
`);
	assert.equal(parsed.errors.length >= 2, true);
	assert.match(parsed.errors[0]?.message ?? "", /OPTIONS:/);
	assert.equal(
		parsed.errors.some((error) => /MEDIA:/.test(error.message)),
		true,
	);
});

test("defaults omitted FILTER to all", () => {
	const parsed = parseMediaGalleryBlock("LOCAL: Photos/cover.png");
	assert.deepEqual(parsed.errors, []);
	assert.equal(parsed.filter, "all");
	assert.equal(parsed.view, "grid");
});

test("parses indented LOCAL, URL, and SEARCH lists", () => {
	const parsed = parseMediaGalleryBlock(`
LOCAL: Resources/Media/2D
LOCAL:
	Resources/Media/3D/render1.png
	Resources/Media/Sketches/
URL:
	https://example.com/a.jpg
	https://example.com/b.jpg | Caption
SEARCH:
	Media/Art/ | Renaissance, Sculpture
	Media/Photos | sunset
`);
	assert.deepEqual(parsed.errors, []);
	assert.equal(parsed.entries.length, 7);
	assert.equal(parsed.entries[0]?.kind, "local");
	assert.equal(parsed.entries[0]?.path, "Resources/Media/2D");
	assert.equal(parsed.entries[1]?.kind, "local");
	assert.equal(parsed.entries[1]?.path, "Resources/Media/3D/render1.png");
	assert.equal(parsed.entries[2]?.kind, "local");
	assert.equal(parsed.entries[2]?.path, "Resources/Media/Sketches");
	assert.equal(parsed.entries[2]?.recursive, true);
	assert.equal(parsed.entries[3]?.kind, "url");
	assert.equal(parsed.entries[4]?.kind, "url");
	assert.equal(parsed.entries[4]?.caption, "Caption");
	assert.equal(parsed.entries[5]?.kind, "search");
	assert.deepEqual(parsed.entries[5]?.queries, ["Renaissance", "Sculpture"]);
	assert.equal(parsed.entries[6]?.kind, "search");
	assert.deepEqual(parsed.entries[6]?.queries, ["sunset"]);
});

test("rejects empty LOCAL headers without indented entries", () => {
	const parsed = parseMediaGalleryBlock("LOCAL:\nVIEW: grid");
	assert.match(parsed.errors[0]?.message ?? "", /requires a value or indented entries/);
});

test("formats consecutive same-kind sources as indented lists", () => {
	const block = formatMediaGalleryBlock({
		view: "grid",
		filter: "all",
		sources: [
			{ kind: "local", path: "Resources/Media/2D" },
			{ kind: "local", path: "Resources/Media/Sketches", recursive: true },
			{ kind: "url", url: "https://example.com/a.jpg" },
		],
	});
	assert.match(block, /^LOCAL:\n\tResources\/Media\/2D\n\tResources\/Media\/Sketches\//m);
	assert.match(block, /^URL: https:\/\/example.com\/a.jpg$/m);
	assert.equal(block.includes("OPTIONS:"), false);
	assert.equal(block.includes("MEDIA:"), false);
	const reparsed = parseMediaGalleryBlock(block);
	assert.deepEqual(reparsed.errors, []);
	assert.equal(reparsed.entries.length, 3);
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
