import type { MediaFilter, MediaKind } from "./types";

export interface XiewerSearchItem {
	id: number;
	path: string;
	name: string;
	relative_path: string;
	kind: string;
	mtime: number;
	indexed_at: string;
	width: number | null;
	height: number | null;
	mime?: string | null;
}

export interface XiewerSearchResponse {
	ok: boolean;
	error?: string;
	items?: XiewerSearchItem[];
}

const DEFAULT_XIEWER_LIMIT = 500;

function normalizeBaseUrl(baseUrl: string): string {
	return baseUrl.trim().replace(/\/+$/, "") || "http://127.0.0.1:47821";
}

function mapKind(kind: string): MediaKind | null {
	const lower = kind.toLowerCase();
	if (lower === "image" || lower === "motion") return "image";
	if (lower === "video") return "video";
	return null;
}

export function xiewerKindAllows(kind: string, filter: MediaFilter): boolean {
	const mapped = mapKind(kind);
	if (!mapped) return false;
	if (filter === "all") return true;
	if (filter === "images") return mapped === "image";
	return mapped === "video";
}

export function xiewerMediaKind(kind: string): MediaKind {
	return mapKind(kind) ?? "image";
}

export async function fetchXiewerSearch(
	baseUrl: string,
	query: string,
	limit: number | null,
	timeoutMs: number,
): Promise<{ items: XiewerSearchItem[]; error?: string }> {
	const root = normalizeBaseUrl(baseUrl);
	const capped = limit ?? DEFAULT_XIEWER_LIMIT;
	const url = `${root}/search?q=${encodeURIComponent(query)}&limit=${capped}`;

	const controller = new AbortController();
	const timer = window.setTimeout(() => controller.abort(), timeoutMs);

	try {
		const health = await fetch(`${root}/health`, { signal: controller.signal });
		if (!health.ok) {
			return {
				items: [],
				error: `CollectionXiewer is not reachable at ${root} (health HTTP ${health.status}). Is the app running?`,
			};
		}

		const response = await fetch(url, { signal: controller.signal });
		const body = (await response.json()) as XiewerSearchResponse;
		if (!response.ok || !body.ok) {
			return {
				items: [],
				error: body.error ?? `CollectionXiewer search failed (HTTP ${response.status}).`,
			};
		}
		return { items: body.items ?? [] };
	} catch (err) {
		const aborted = err instanceof Error && err.name === "AbortError";
		return {
			items: [],
			error: aborted
				? `CollectionXiewer timed out at ${root}. Is the app running?`
				: `CollectionXiewer is not reachable at ${root}. Is the app running?`,
		};
	} finally {
		window.clearTimeout(timer);
	}
}

export function xiewerFileUrl(baseUrl: string, id: number): string {
	return `${normalizeBaseUrl(baseUrl)}/file/${id}`;
}
