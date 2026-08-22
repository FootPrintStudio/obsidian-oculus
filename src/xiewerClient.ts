import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { MediaFilter, MediaKind } from "./types";

export interface XiewerSearchItem {
	id: number;
	/** Loopback `/file/:id` URL (no absolute filesystem path). */
	url: string;
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

export interface LocalApiSession {
	baseUrl: string;
	token: string;
	tokenHeader: string;
}

const DEFAULT_XIEWER_LIMIT = 500;
const DEFAULT_BASE_URL = "http://127.0.0.1:47821";
const DEFAULT_TOKEN_HEADER = "X-CollectionXiewer-Token";

const objectUrlCache = new Map<string, string>();

function normalizeBaseUrl(baseUrl: string): string {
	return baseUrl.trim().replace(/\/+$/, "") || DEFAULT_BASE_URL;
}

function localApiConfigPath(): string {
	const xdg = process.env.XDG_CONFIG_HOME?.trim();
	const configRoot = xdg && xdg.length > 0 ? xdg : join(homedir(), ".config");
	return join(configRoot, "CollectionXiewer", "local-api.json");
}

/** Read session token written by CollectionXiewer on startup (mode 0600). */
export function readLocalApiSession(preferredBaseUrl?: string): LocalApiSession | null {
	if (typeof process === "undefined" || !process.versions?.node) return null;
	try {
		const raw = readFileSync(localApiConfigPath(), "utf8");
		const parsed = JSON.parse(raw) as {
			host?: string;
			port?: number;
			token?: string;
			tokenHeader?: string;
		};
		const token = typeof parsed.token === "string" ? parsed.token.trim() : "";
		if (!token) return null;

		const preferred = preferredBaseUrl ? normalizeBaseUrl(preferredBaseUrl) : "";
		const fromFile =
			typeof parsed.host === "string" && Number.isFinite(parsed.port)
				? `http://${parsed.host}:${parsed.port}`
				: "";
		const baseUrl = preferred || fromFile || DEFAULT_BASE_URL;
		const tokenHeader =
			typeof parsed.tokenHeader === "string" && parsed.tokenHeader.trim()
				? parsed.tokenHeader.trim()
				: DEFAULT_TOKEN_HEADER;

		return { baseUrl: normalizeBaseUrl(baseUrl), token, tokenHeader };
	} catch {
		return null;
	}
}

function authHeaders(session: LocalApiSession): Record<string, string> {
	return {
		[session.tokenHeader]: session.token,
		Authorization: `Bearer ${session.token}`,
	};
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
	preferredBaseUrl: string,
	query: string,
	limit: number | null,
	timeoutMs: number,
): Promise<{ items: XiewerSearchItem[]; session?: LocalApiSession; error?: string }> {
	const session = readLocalApiSession(preferredBaseUrl);
	if (!session) {
		return {
			items: [],
			error:
				"CollectionXiewer local-api.json not found. Is CollectionXiewer running? (token file: ~/.config/CollectionXiewer/local-api.json)",
		};
	}

	const root = normalizeBaseUrl(preferredBaseUrl) || session.baseUrl;
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

		const response = await fetch(url, {
			signal: controller.signal,
			headers: authHeaders(session),
		});
		if (response.status === 401) {
			return {
				items: [],
				error:
					"CollectionXiewer rejected the API token (401). Restart CollectionXiewer and reload the note.",
			};
		}

		const body = (await response.json()) as XiewerSearchResponse;
		if (!response.ok || !body.ok) {
			return {
				items: [],
				error: body.error ?? `CollectionXiewer search failed (HTTP ${response.status}).`,
			};
		}
		return { items: body.items ?? [], session: { ...session, baseUrl: root } };
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

/** Fetch an authenticated /file/:id into a blob: URL (img/video cannot send auth headers). */
export async function resolveXiewerObjectUrl(fileUrl: string, token: string, tokenHeader = DEFAULT_TOKEN_HEADER): Promise<string> {
	const cacheKey = `${tokenHeader}:${token}:${fileUrl}`;
	const cached = objectUrlCache.get(cacheKey);
	if (cached) return cached;

	const response = await fetch(fileUrl, {
		headers: {
			[tokenHeader]: token,
			Authorization: `Bearer ${token}`,
		},
	});
	if (response.status === 401) {
		throw new Error("Unauthorized CollectionXiewer file request (stale token).");
	}
	if (!response.ok) {
		throw new Error(`CollectionXiewer file HTTP ${response.status}`);
	}
	const blob = await response.blob();
	const objectUrl = URL.createObjectURL(blob);
	objectUrlCache.set(cacheKey, objectUrl);
	return objectUrl;
}

export function revokeXiewerObjectUrls(): void {
	for (const url of objectUrlCache.values()) URL.revokeObjectURL(url);
	objectUrlCache.clear();
}
