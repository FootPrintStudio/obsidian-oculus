import { DEFAULT_COLUMN_OPTION } from "./layout/columnOptions";
import { parseMediaTitleQueries } from "./searchQuery";
import {
	type GallerySortMode,
	type GalleryViewType,
	type LocalMediaEntry,
	type MediaEntry,
	type MediaFilter,
	type ParseError,
	type ParsedGalleryBlock,
	type SearchMediaEntry,
	type XiewerMediaEntry,
	MEDIA_FILTERS,
	VIEW_TYPES,
} from "./types";

const DEFAULT_GRID_COLUMNS = DEFAULT_COLUMN_OPTION;
const DEFAULT_THUMBNAIL_COLUMNS = DEFAULT_COLUMN_OPTION;
const DEFAULT_CAROUSEL_HEIGHT_PX = 420;
const DEFAULT_MASONRY_ROW_HEIGHT_PX = 200;

type MediaKey = "LOCAL" | "SEARCH" | "URL" | "XIEWER";

function normalizeLine(raw: string): string {
	let line = raw.trim();
	if (line.startsWith("- ")) line = line.slice(2).trim();
	return line;
}

function isContinuationLine(raw: string): boolean {
	return /^(\t| {2,})/.test(raw);
}

function splitCaption(value: string): { main: string; caption?: string } {
	const pipeIndex = value.indexOf("|");
	if (pipeIndex === -1) return { main: value.trim() };
	return {
		main: value.slice(0, pipeIndex).trim(),
		caption: value.slice(pipeIndex + 1).trim() || undefined,
	};
}

export function resolveCarouselHeightPx(value: number | null): number {
	return value ?? DEFAULT_CAROUSEL_HEIGHT_PX;
}

export function resolveMasonryRowHeightPx(value: number | null): number {
	return value ?? DEFAULT_MASONRY_ROW_HEIGHT_PX;
}

function parseMasonryHOptions(optionPart: string, line: number, errors: ParseError[]): number | null {
	if (!optionPart) return null;

	const token = optionPart.split(",")[0]?.trim() ?? "";
	const heightMatch = /^(\d+)\s*px$/i.exec(token);
	if (heightMatch?.[1]) return Number.parseInt(heightMatch[1], 10);

	errors.push({
		line,
		message: `Unknown masonry-h VIEW option "${token}". Use row height like 300px.`,
	});
	return null;
}

function parseCarouselOptions(
	optionPart: string,
	line: number,
	errors: ParseError[],
): { heightPx: number | null; showThumbnails: boolean } {
	let heightPx: number | null = null;
	let showThumbnails = false;

	if (!optionPart) return { heightPx, showThumbnails };

	for (const token of optionPart.split(",").map((part) => part.trim()).filter(Boolean)) {
		const lower = token.toLowerCase();
		if (lower === "show") {
			showThumbnails = true;
			continue;
		}

		const heightMatch = /^(\d+)\s*px$/i.exec(token);
		if (heightMatch?.[1]) {
			heightPx = Number.parseInt(heightMatch[1], 10);
			continue;
		}

		errors.push({
			line,
			message: `Unknown carousel VIEW option "${token}". Use height like 500px and/or "show" for thumbnails.`,
		});
	}

	return { heightPx, showThumbnails };
}

interface ViewParseResult {
	view: GalleryViewType;
	gridColumns: string;
	thumbnailColumns: string;
	carouselHeightPx: number | null;
	carouselShowThumbnails: boolean;
	masonryRowHeightPx: number | null;
	masonryColumnWidth: string;
}

const VIEWS_WITH_OPTIONS: GalleryViewType[] = ["grid", "thumbnails", "carousel", "masonry-h", "masonry-v"];

function parseViewLine(value: string, line: number, errors: ParseError[]): ViewParseResult | null {
	const pipeIndex = value.indexOf("|");
	const viewPart = (pipeIndex === -1 ? value : value.slice(0, pipeIndex)).trim();
	const optionPart = pipeIndex === -1 ? "" : value.slice(pipeIndex + 1).trim();

	if (viewPart.includes(",")) {
		errors.push({
			line,
			message: `VIEW type must be a single value (got "${viewPart}"). Use one of: ${VIEW_TYPES.join(", ")}`,
		});
		return null;
	}

	const normalized = viewPart.toLowerCase() as GalleryViewType;
	if (!VIEW_TYPES.includes(normalized)) {
		errors.push({
			line,
			message: `Unknown VIEW "${viewPart}". Use one of: ${VIEW_TYPES.join(", ")}`,
		});
		return null;
	}

	if (optionPart && !VIEWS_WITH_OPTIONS.includes(normalized)) {
		errors.push({
			line,
			message: `VIEW options after | are only supported for grid, thumbnails, carousel, masonry-h, and masonry-v (got "${normalized}").`,
		});
		return null;
	}

	let gridColumns = DEFAULT_GRID_COLUMNS;
	let thumbnailColumns = DEFAULT_THUMBNAIL_COLUMNS;
	let carouselHeightPx: number | null = null;
	let carouselShowThumbnails = false;
	let masonryRowHeightPx: number | null = null;
	let masonryColumnWidth = DEFAULT_COLUMN_OPTION;

	if (normalized === "grid") {
		gridColumns = optionPart || DEFAULT_GRID_COLUMNS;
	} else if (normalized === "thumbnails") {
		thumbnailColumns = optionPart || DEFAULT_THUMBNAIL_COLUMNS;
	} else if (normalized === "carousel" && optionPart) {
		const carousel = parseCarouselOptions(optionPart, line, errors);
		carouselHeightPx = carousel.heightPx;
		carouselShowThumbnails = carousel.showThumbnails;
	} else if (normalized === "masonry-h" && optionPart) {
		masonryRowHeightPx = parseMasonryHOptions(optionPart, line, errors);
	} else if (normalized === "masonry-v") {
		masonryColumnWidth = optionPart || DEFAULT_COLUMN_OPTION;
	}

	return {
		view: normalized,
		gridColumns,
		thumbnailColumns,
		carouselHeightPx,
		carouselShowThumbnails,
		masonryRowHeightPx,
		masonryColumnWidth,
	};
}

function parseFilterValue(value: string, line: number, errors: ParseError[]): MediaFilter | null {
	if (value.includes("|")) {
		errors.push({
			line,
			message: `FILTER does not support options after | (got "${value}").`,
		});
		return null;
	}
	if (value.includes(",")) {
		errors.push({
			line,
			message: `FILTER accepts a single value (got "${value}"). Use one of: ${MEDIA_FILTERS.join(", ")}`,
		});
		return null;
	}
	const normalized = value.toLowerCase().trim() as MediaFilter;
	if (!MEDIA_FILTERS.includes(normalized)) {
		errors.push({
			line,
			message: `Unknown FILTER "${value}". Use one of: ${MEDIA_FILTERS.join(", ")}`,
		});
		return null;
	}
	return normalized;
}

function parseLocalPath(main: string): { path: string; recursive: boolean } {
	// Ignore the retired LOCAL "recursive" keyword so old blocks still resolve a path.
	let path = main.replace(/\s+recursive\s*$/i, "").trim();
	const recursive = path.endsWith("/");
	if (recursive) path = path.replace(/\/+$/, "");

	return { path, recursive };
}

function parseSearchPath(main: string): { path: string; recursive: boolean } {
	// SEARCH accepted the keyword before Oculus standardized on trailing slashes.
	const hasLegacyRecursiveKeyword = /\s+recursive\s*$/i.test(main);
	let path = main.replace(/\s+recursive\s*$/i, "").trim();
	const recursive = hasLegacyRecursiveKeyword || path.endsWith("/");
	if (path.endsWith("/")) path = path.replace(/\/+$/, "");

	return { path, recursive };
}

function parseLocalLine(rest: string, line: number, errors: ParseError[]): LocalMediaEntry | null {
	const { main, caption } = splitCaption(rest);
	if (!main) {
		errors.push({ line, message: "LOCAL entry is missing a path." });
		return null;
	}

	const { path, recursive } = parseLocalPath(main);
	if (!path) {
		errors.push({ line, message: "LOCAL entry is missing a path." });
		return null;
	}

	return { kind: "local", path, recursive, caption, line };
}

function parseSearchLine(rest: string, line: number, errors: ParseError[]): SearchMediaEntry | null {
	const pipeIndex = rest.indexOf("|");
	if (pipeIndex === -1) {
		errors.push({
			line,
			message: 'SEARCH entry requires a title query after "|".',
		});
		return null;
	}

	const main = rest.slice(0, pipeIndex).trim();
	const queryText = rest.slice(pipeIndex + 1).trim();
	if (!main) {
		errors.push({ line, message: "SEARCH entry is missing a folder path." });
		return null;
	}
	if (!queryText) {
		errors.push({ line, message: "SEARCH entry is missing a title query." });
		return null;
	}
	const queries = parseMediaTitleQueries(queryText);
	if (!queries) {
		errors.push({
			line,
			message: "SEARCH queries must be comma-separated, non-empty text values.",
		});
		return null;
	}

	const { path, recursive } = parseSearchPath(main);
	if (!path) {
		errors.push({ line, message: "SEARCH entry is missing a folder path." });
		return null;
	}

	return { kind: "search", path, recursive, queries, line };
}

function parseUrlLine(rest: string, line: number, errors: ParseError[]): MediaEntry | null {
	const { main, caption } = splitCaption(rest);
	if (!main) {
		errors.push({ line, message: "URL entry is missing a URL." });
		return null;
	}
	if (!/^https?:\/\//i.test(main)) {
		errors.push({ line, message: "URL must start with http:// or https://." });
		return null;
	}
	return { kind: "url", url: main, caption, line };
}

function parseXiewerLine(rest: string, line: number, errors: ParseError[]): XiewerMediaEntry | null {
	const query = rest.trim();
	if (!query) {
		errors.push({ line, message: "XIEWER entry requires a CollectionXiewer search query." });
		return null;
	}
	return { kind: "xiewer", query, line };
}

function parseLimitValue(value: string, line: number, errors: ParseError[]): number | null {
	const trimmed = value.trim();
	if (!/^\d+$/.test(trimmed)) {
		errors.push({
			line,
			message: `LIMIT must be a positive integer (got "${value}").`,
		});
		return null;
	}
	const n = Number.parseInt(trimmed, 10);
	if (n <= 0) {
		errors.push({ line, message: "LIMIT must be a positive integer." });
		return null;
	}
	return n;
}

function parseSortValue(value: string, line: number, errors: ParseError[]): GallerySortMode | null {
	const trimmed = value.trim().replace(/\s+/g, " ");
	const lower = trimmed.toLowerCase();

	if (lower === "random") return "random";

	const match = /^(name|date)\s+(asc|dsc|desc)$/i.exec(trimmed);
	if (!match?.[1] || !match[2]) {
		errors.push({
			line,
			message: `Unknown SORT "${value}". Use: name ASC, name DSC, date ASC, date DSC, or random.`,
		});
		return null;
	}

	const field = match[1].toLowerCase() as "name" | "date";
	const dirRaw = match[2].toLowerCase();
	const dir = dirRaw === "asc" ? "asc" : "dsc";
	return `${field}-${dir}` as GallerySortMode;
}

function parseMediaValue(
	kind: MediaKey,
	value: string,
	line: number,
	errors: ParseError[],
): MediaEntry | null {
	if (kind === "LOCAL") return parseLocalLine(value, line, errors);
	if (kind === "SEARCH") return parseSearchLine(value, line, errors);
	if (kind === "XIEWER") return parseXiewerLine(value, line, errors);
	return parseUrlLine(value, line, errors);
}

export function parseMediaGalleryBlock(
	source: string,
	defaultView: GalleryViewType = "grid",
	defaultFilter: MediaFilter = "all",
): ParsedGalleryBlock {
	const errors: ParseError[] = [];
	let view: GalleryViewType = defaultView;
	let gridColumns = DEFAULT_GRID_COLUMNS;
	let thumbnailColumns = DEFAULT_THUMBNAIL_COLUMNS;
	let carouselHeightPx: number | null = null;
	let carouselShowThumbnails = false;
	let masonryRowHeightPx: number | null = null;
	let masonryColumnWidth = DEFAULT_COLUMN_OPTION;
	let filter: MediaFilter = defaultFilter;
	let limit: number | null = null;
	let sort: GallerySortMode | null = null;
	let sawView = false;
	let sawFilter = false;
	let sawLimit = false;
	let sawSort = false;
	let continuationKind: MediaKey | null = null;
	let continuationHasEntry = false;
	let pendingEmptyHeaderLine: number | null = null;
	const entries: MediaEntry[] = [];

	const flushEmptyHeader = (): void => {
		if (continuationKind && !continuationHasEntry && pendingEmptyHeaderLine != null) {
			errors.push({
				line: pendingEmptyHeaderLine,
				message: `${continuationKind}: requires a value or indented entries below it.`,
			});
		}
		pendingEmptyHeaderLine = null;
	};

	const lines = source.split("\n");
	for (let i = 0; i < lines.length; i++) {
		const lineNum = i + 1;
		const raw = lines[i] ?? "";
		const line = normalizeLine(raw);
		if (!line || line.startsWith("#")) continue;

		if (isContinuationLine(raw)) {
			if (!continuationKind) {
				errors.push({
					line: lineNum,
					message: "Indented line must follow LOCAL:, SEARCH:, URL:, or XIEWER:.",
				});
				continue;
			}
			const entry = parseMediaValue(continuationKind, line, lineNum, errors);
			if (entry) {
				entries.push(entry);
				continuationHasEntry = true;
				pendingEmptyHeaderLine = null;
			}
			continue;
		}

		flushEmptyHeader();
		continuationKind = null;
		continuationHasEntry = false;

		const colonIndex = line.indexOf(":");
		if (colonIndex === -1) {
			errors.push({ line: lineNum, message: `Unrecognized line: "${line}"` });
			continue;
		}

		const key = line.slice(0, colonIndex).trim().toUpperCase();
		const value = line.slice(colonIndex + 1).trim();

		if (key === "OPTIONS" || key === "MEDIA") {
			errors.push({
				line: lineNum,
				message: `${key}: is no longer valid. Put VIEW, FILTER, LIMIT, SORT, LOCAL, SEARCH, URL, and XIEWER at the top level.`,
			});
			continue;
		}

		if (key === "VIEW") {
			const parsed = parseViewLine(value, lineNum, errors);
			if (parsed) {
				if (sawView) errors.push({ line: lineNum, message: "Duplicate VIEW option." });
				else {
					view = parsed.view;
					gridColumns = parsed.gridColumns;
					thumbnailColumns = parsed.thumbnailColumns;
					carouselHeightPx = parsed.carouselHeightPx;
					carouselShowThumbnails = parsed.carouselShowThumbnails;
					masonryRowHeightPx = parsed.masonryRowHeightPx;
					masonryColumnWidth = parsed.masonryColumnWidth;
					sawView = true;
				}
			}
			continue;
		}

		if (key === "FILTER") {
			const parsed = parseFilterValue(value, lineNum, errors);
			if (parsed) {
				if (sawFilter) errors.push({ line: lineNum, message: "Duplicate FILTER option." });
				else {
					filter = parsed;
					sawFilter = true;
				}
			}
			continue;
		}

		if (key === "LIMIT") {
			const parsed = parseLimitValue(value, lineNum, errors);
			if (parsed != null) {
				if (sawLimit) errors.push({ line: lineNum, message: "Duplicate LIMIT option." });
				else {
					limit = parsed;
					sawLimit = true;
				}
			}
			continue;
		}

		if (key === "SORT") {
			const parsed = parseSortValue(value, lineNum, errors);
			if (parsed) {
				if (sawSort) errors.push({ line: lineNum, message: "Duplicate SORT option." });
				else {
					sort = parsed;
					sawSort = true;
				}
			}
			continue;
		}

		if (key === "LOCAL" || key === "SEARCH" || key === "URL" || key === "XIEWER") {
			continuationKind = key;
			if (!value) {
				continuationHasEntry = false;
				pendingEmptyHeaderLine = lineNum;
			} else {
				const entry = parseMediaValue(key, value, lineNum, errors);
				if (entry) {
					entries.push(entry);
					continuationHasEntry = true;
				} else {
					continuationHasEntry = true;
				}
			}
			continue;
		}

		errors.push({
			line: lineNum,
			message: `Unrecognized key "${key}". Use VIEW, FILTER, LIMIT, SORT, LOCAL, SEARCH, URL, or XIEWER.`,
		});
	}

	flushEmptyHeader();

	if (entries.length === 0 && errors.length === 0) {
		errors.push({
			line: 1,
			message: "Block requires at least one LOCAL:, SEARCH:, URL:, or XIEWER: entry.",
		});
	}

	return {
		view,
		filter,
		limit,
		sort,
		gridColumns,
		thumbnailColumns,
		carouselHeightPx,
		carouselShowThumbnails,
		masonryRowHeightPx,
		masonryColumnWidth,
		entries,
		errors,
	};
}

function formatViewLine(options: {
	view: GalleryViewType;
	gridColumns?: string;
	thumbnailColumns?: string;
	carouselHeightPx?: number | null;
	carouselShowThumbnails?: boolean;
	masonryRowHeightPx?: number | null;
	masonryColumnWidth?: string;
}): string {
	if (options.view === "grid") {
		const columns = (options.gridColumns ?? DEFAULT_GRID_COLUMNS).trim();
		if (columns && columns.toLowerCase() !== "auto") {
			return `VIEW: grid | ${columns}`;
		}
		return "VIEW: grid";
	}

	if (options.view === "thumbnails") {
		const columns = (options.thumbnailColumns ?? DEFAULT_THUMBNAIL_COLUMNS).trim();
		if (columns && columns.toLowerCase() !== "auto") {
			return `VIEW: thumbnails | ${columns}`;
		}
		return "VIEW: thumbnails";
	}

	if (options.view === "carousel") {
		const parts: string[] = [];
		if (options.carouselHeightPx != null) parts.push(`${options.carouselHeightPx}px`);
		if (options.carouselShowThumbnails) parts.push("show");
		if (parts.length > 0) return `VIEW: carousel | ${parts.join(", ")}`;
		return "VIEW: carousel";
	}

	if (options.view === "masonry-h" && options.masonryRowHeightPx != null) {
		return `VIEW: masonry-h | ${options.masonryRowHeightPx}px`;
	}

	if (options.view === "masonry-v") {
		const columns = (options.masonryColumnWidth ?? DEFAULT_COLUMN_OPTION).trim();
		if (columns && columns.toLowerCase() !== "auto") {
			return `VIEW: masonry-v | ${columns}`;
		}
		return "VIEW: masonry-v";
	}

	return `VIEW: ${options.view}`;
}

function formatSourceValue(source: FormattedMediaSource): string {
	if (source.kind === "local") {
		let path = source.path.replace(/\/+$/, "");
		if (source.recursive) path = `${path}/`;
		return source.caption ? `${path} | ${source.caption}` : path;
	}
	if (source.kind === "search") {
		let path = source.path.replace(/\/+$/, "");
		if (source.recursive) path = `${path}/`;
		const queries = source.queries.map((query) => query.trim());
		if (queries.length === 0 || queries.some((query) => !query)) {
			throw new Error("SEARCH sources require one or more non-empty queries.");
		}
		return `${path} | ${queries.join(", ")}`;
	}
	if (source.kind === "xiewer") {
		const query = source.query.trim();
		if (!query) throw new Error("XIEWER sources require a non-empty query.");
		return query;
	}
	return source.caption ? `${source.url} | ${source.caption}` : source.url;
}

function sourceKey(kind: FormattedMediaSource["kind"]): MediaKey {
	if (kind === "local") return "LOCAL";
	if (kind === "search") return "SEARCH";
	if (kind === "xiewer") return "XIEWER";
	return "URL";
}

function formatSortLine(sort: GallerySortMode): string {
	if (sort === "random") return "SORT: random";
	const [field, dir] = sort.split("-") as ["name" | "date", "asc" | "dsc"];
	return `SORT: ${field} ${dir.toUpperCase()}`;
}

export type FormattedMediaSource =
	| { kind: "local"; path: string; recursive?: boolean; caption?: string }
	| { kind: "search"; path: string; recursive?: boolean; queries: string[] }
	| { kind: "url"; url: string; caption?: string }
	| { kind: "xiewer"; query: string };

interface FormatMediaGalleryBase {
	view: GalleryViewType;
	filter: MediaFilter;
	limit?: number | null;
	sort?: GallerySortMode | null;
	gridColumns?: string;
	thumbnailColumns?: string;
	carouselHeightPx?: number | null;
	carouselShowThumbnails?: boolean;
	masonryRowHeightPx?: number | null;
	masonryColumnWidth?: string;
}

type FormatMediaGallerySources =
	| {
			sources: FormattedMediaSource[];
			locals?: never;
			searches?: never;
			urls?: never;
			xiewers?: never;
	  }
	| {
			sources?: never;
			locals: Array<{ path: string; recursive?: boolean; caption?: string }>;
			searches?: Array<{ path: string; recursive?: boolean; queries: string[] }>;
			urls: Array<{ url: string; caption?: string }>;
			xiewers?: Array<{ query: string }>;
	  };

export function formatMediaGalleryBlock(
	options: FormatMediaGalleryBase & FormatMediaGallerySources,
): string {
	const lines: string[] = [formatViewLine(options), `FILTER: ${options.filter}`];
	if (options.limit != null) lines.push(`LIMIT: ${options.limit}`);
	if (options.sort) lines.push(formatSortLine(options.sort));

	const sources: FormattedMediaSource[] =
		options.sources ??
		[
			...(options.locals ?? []).map((local) => ({ kind: "local" as const, ...local })),
			...(options.searches ?? []).map((search) => ({ kind: "search" as const, ...search })),
			...(options.urls ?? []).map((url) => ({ kind: "url" as const, ...url })),
			...(options.xiewers ?? []).map((xiewer) => ({ kind: "xiewer" as const, ...xiewer })),
		];

	let index = 0;
	while (index < sources.length) {
		const first = sources[index];
		if (!first) break;
		const kind = first.kind;
		const group: FormattedMediaSource[] = [];
		while (index < sources.length && sources[index]?.kind === kind) {
			const item = sources[index];
			if (item) group.push(item);
			index += 1;
		}
		const key = sourceKey(kind);
		if (group.length === 1 && group[0]) {
			lines.push(`${key}: ${formatSourceValue(group[0])}`);
			continue;
		}
		lines.push(`${key}:`);
		for (const item of group) {
			lines.push(`\t${formatSourceValue(item)}`);
		}
	}

	return lines.join("\n");
}

