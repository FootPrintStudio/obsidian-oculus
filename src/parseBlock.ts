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

function parseViewValue(value: string, line: number, errors: ParseError[]): GalleryViewType | null {
	if (value.includes(",")) {
		errors.push({
			line,
			message: `VIEW accepts a single value (got "${value}"). Use one of: ${VIEW_TYPES.join(", ")}`,
		});
		return null;
	}
	const normalized = value.toLowerCase().trim() as GalleryViewType;
	if (!VIEW_TYPES.includes(normalized)) {
		errors.push({
			line,
			message: `Unknown VIEW "${value}". Use one of: ${VIEW_TYPES.join(", ")}`,
		});
		return null;
	}
	return normalized;
}

function parseFilterValue(value: string, line: number, errors: ParseError[]): MediaFilter | null {
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
				const parsed = parseViewValue(value, lineNum, errors);
				if (parsed) {
					if (sawView) errors.push({ line: lineNum, message: "Duplicate VIEW option." });
					else {
						view = parsed;
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

	return { view, filter, entries, errors };
}

export function formatMediaGalleryBlock(options: {
	view: GalleryViewType;
	filter: MediaFilter;
	locals: Array<{ path: string; recursive?: boolean; caption?: string }>;
	urls: Array<{ url: string; caption?: string }>;
}): string {
	const lines: string[] = ["OPTIONS:", `VIEW: ${options.view}`, `FILTER: ${options.filter}`, "MEDIA:"];

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
