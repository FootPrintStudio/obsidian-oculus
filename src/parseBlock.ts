import { DEFAULT_COLUMN_OPTION } from "./layout/columnOptions";
import {
	type GalleryViewType,
	type LocalMediaEntry,
	type MediaEntry,
	type MediaFilter,
	type ParseError,
	type ParsedGalleryBlock,
	MEDIA_FILTERS,
	VIEW_TYPES,
} from "./types";

type Section = "none" | "options" | "media";

const DEFAULT_GRID_COLUMNS = DEFAULT_COLUMN_OPTION;
const DEFAULT_THUMBNAIL_COLUMNS = DEFAULT_COLUMN_OPTION;
const DEFAULT_CAROUSEL_HEIGHT_PX = 420;
const DEFAULT_MASONRY_ROW_HEIGHT_PX = 200;

function normalizeLine(raw: string): string {
	let line = raw.trim();
	if (line.startsWith("- ")) line = line.slice(2).trim();
	return line;
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

function parseLocalLine(rest: string, line: number, errors: ParseError[]): LocalMediaEntry | null {
	const { main, caption } = splitCaption(rest);
	if (!main) {
		errors.push({ line, message: "LOCAL entry is missing a path." });
		return null;
	}

	let path = main;
	let recursive = path.endsWith("/");
	if (path.endsWith("/")) path = path.slice(0, -1);

	const recursiveMatch = /\s+recursive\s*$/i.exec(path);
	if (recursiveMatch) {
		recursive = true;
		path = path.slice(0, recursiveMatch.index).trim();
	}

	if (!path) {
		errors.push({ line, message: "LOCAL entry is missing a path." });
		return null;
	}

	return { kind: "local", path, recursive, caption, line };
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

export function parseMediaGalleryBlock(
	source: string,
	defaultView: GalleryViewType = "grid",
): ParsedGalleryBlock {
	const errors: ParseError[] = [];
	let view: GalleryViewType = defaultView;
	let gridColumns = DEFAULT_GRID_COLUMNS;
	let thumbnailColumns = DEFAULT_THUMBNAIL_COLUMNS;
	let carouselHeightPx: number | null = null;
	let carouselShowThumbnails = false;
	let masonryRowHeightPx: number | null = null;
	let masonryColumnWidth = DEFAULT_COLUMN_OPTION;
	let filter: MediaFilter = "images";
	let section: Section = "none";
	let sawView = false;
	let sawFilter = false;
	const entries: MediaEntry[] = [];

	const lines = source.split("\n");
	for (let i = 0; i < lines.length; i++) {
		const lineNum = i + 1;
		const line = normalizeLine(lines[i] ?? "");
		if (!line || line.startsWith("#")) continue;

		if (/^OPTIONS:$/i.test(line)) {
			section = "options";
			continue;
		}
		if (/^MEDIA:$/i.test(line)) {
			section = "media";
			continue;
		}

		const colonIndex = line.indexOf(":");
		if (colonIndex === -1) {
			errors.push({ line: lineNum, message: `Unrecognized line: "${line}"` });
			continue;
		}

		const key = line.slice(0, colonIndex).trim().toUpperCase();
		const value = line.slice(colonIndex + 1).trim();

		if (key === "LOCAL" || key === "URL") {
			section = "media";
		} else if (key === "VIEW" || key === "FILTER") {
			if (section === "media") {
				errors.push({
					line: lineNum,
					message: `${key} must appear in OPTIONS (before MEDIA entries).`,
				});
				continue;
			}
			section = section === "none" ? "options" : section;
		}

		if (section === "options" || (section === "none" && (key === "VIEW" || key === "FILTER"))) {
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
			} else if (key === "FILTER") {
				const parsed = parseFilterValue(value, lineNum, errors);
				if (parsed) {
					if (sawFilter) errors.push({ line: lineNum, message: "Duplicate FILTER option." });
					else {
						filter = parsed;
						sawFilter = true;
					}
				}
			}
			continue;
		}

		if (section === "media" || key === "LOCAL" || key === "URL") {
			if (key === "LOCAL") {
				const entry = parseLocalLine(value, lineNum, errors);
				if (entry) entries.push(entry);
			} else if (key === "URL") {
				const entry = parseUrlLine(value, lineNum, errors);
				if (entry) entries.push(entry);
			} else {
				errors.push({ line: lineNum, message: `Expected LOCAL: or URL: in MEDIA section (got ${key}).` });
			}
		}
	}

	if (entries.length === 0 && errors.length === 0) {
		errors.push({ line: 1, message: "MEDIA section requires at least one LOCAL: or URL: entry." });
	}

	return {
		view,
		filter,
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

export function formatMediaGalleryBlock(options: {
	view: GalleryViewType;
	filter: MediaFilter;
	gridColumns?: string;
	thumbnailColumns?: string;
	carouselHeightPx?: number | null;
	carouselShowThumbnails?: boolean;
	masonryRowHeightPx?: number | null;
	masonryColumnWidth?: string;
	locals: Array<{ path: string; recursive?: boolean; caption?: string }>;
	urls: Array<{ url: string; caption?: string }>;
}): string {
	const lines: string[] = [
		"OPTIONS:",
		formatViewLine(options),
		`FILTER: ${options.filter}`,
		"MEDIA:",
	];

	for (const local of options.locals) {
		let path = local.path;
		if (local.recursive) path = `${path.replace(/\/$/, "")} recursive`;
		const caption = local.caption ? ` | ${local.caption}` : "";
		lines.push(`LOCAL: ${path}${caption}`);
	}

	for (const url of options.urls) {
		const caption = url.caption ? ` | ${url.caption}` : "";
		lines.push(`URL: ${url.url}${caption}`);
	}

	return lines.join("\n");
}
