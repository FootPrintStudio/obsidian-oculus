export const DEFAULT_COLUMN_OPTION = "auto";

export const GRID_AUTO_MIN_PX = 160;
export const THUMBNAIL_AUTO_MIN_PX = 96;
export const MASONRY_AUTO_MIN_PX = 160;

/** Parsed column option shared by grid, thumbnails, and masonry-v. */
export type ColumnSpec =
	| { mode: "auto" }
	| { mode: "width"; px: number }
	| { mode: "count"; columns: number }
	| { mode: "css"; value: string };

/** @deprecated Use `ColumnSpec`. */
export type MasonryColumnSpec = ColumnSpec;

/** @deprecated Use `DEFAULT_COLUMN_OPTION`. */
export const DEFAULT_MASONRY_COLUMN_WIDTH = DEFAULT_COLUMN_OPTION;

/**
 * Parse a column option string.
 * Supports: auto, Npx, N (fixed count), minmax(Npx, …) extraction, or raw CSS.
 */
export function parseColumnOption(value: string): ColumnSpec {
	const trimmed = value.trim();
	if (!trimmed || trimmed.toLowerCase() === "auto") return { mode: "auto" };

	const pxMatch = /^(\d+)\s*px$/i.exec(trimmed);
	if (pxMatch?.[1]) return { mode: "width", px: Number.parseInt(pxMatch[1], 10) };

	if (/^\d+$/.test(trimmed)) {
		return { mode: "count", columns: Number.parseInt(trimmed, 10) };
	}

	const minmaxMatch = /minmax\(\s*(\d+)\s*px/i.exec(trimmed);
	if (minmaxMatch?.[1]) {
		return { mode: "width", px: Number.parseInt(minmaxMatch[1], 10) };
	}

	return { mode: "css", value: trimmed };
}

/** @deprecated Use `parseColumnOption`. */
export function parseMasonryColumnSpec(value: string): ColumnSpec {
	return parseColumnOption(value);
}

/** Resolve a column option to a CSS `grid-template-columns` value. */
export function resolveGridTemplateColumns(value: string, autoMinPx: number): string {
	const spec = parseColumnOption(value);

	switch (spec.mode) {
		case "auto":
			return `repeat(auto-fill, minmax(${autoMinPx}px, 1fr))`;
		case "width":
			return `repeat(auto-fill, minmax(${spec.px}px, 1fr))`;
		case "count":
			return `repeat(${spec.columns}, 1fr)`;
		case "css":
			return spec.value;
	}
}

export function resolveGridColumns(value: string): string {
	return resolveGridTemplateColumns(value, GRID_AUTO_MIN_PX);
}

export function resolveThumbnailColumns(value: string): string {
	return resolveGridTemplateColumns(value, THUMBNAIL_AUTO_MIN_PX);
}

function divInt(a: number, b: number): number {
	return Math.floor((a + b / 2) / b);
}

/** Resolve column count and width for masonry-v layout. */
export function resolveColumnLayout(
	spec: ColumnSpec,
	containerWidth: number,
	autoMinPx: number = MASONRY_AUTO_MIN_PX,
): { columnCount: number; columnWidth: number } {
	const cw = Math.max(containerWidth, autoMinPx);
	let columnCount: number;

	if (spec.mode === "count") {
		columnCount = Math.max(1, spec.columns);
	} else if (spec.mode === "width") {
		columnCount = Math.max(1, divInt(cw, spec.px));
	} else {
		columnCount = Math.max(1, divInt(cw, autoMinPx));
	}

	return { columnCount, columnWidth: divInt(cw, columnCount) };
}
