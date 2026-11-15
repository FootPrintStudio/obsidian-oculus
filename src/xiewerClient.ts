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

/** Cache of authenticated `/file/:id` responses as blob: URLs, keyed by token+header+URL. */
const objectUrlCache = new Map<string, string>();

/** Last session token that successfully authenticated (for rotation detection). */
let lastKnownToken: string | null = null;

function normalizeBaseUrl(baseUrl: string): string {
	return baseUrl.trim().replace(/\/+$/, "") || DEFAULT_BASE_URL;
}

function localApiConfigPath(): string {
	const xdg = process.env.XDG_CONFIG_HOME?.trim();
	const configRoot = xdg && xdg.length > 0 ? xdg : join(homedir(), ".config");
	return join(configRoot, "CollectionXiewer", "local-api.json");
}

function objectUrlCacheKey(tokenHeader: string, token: string, fileUrl: string): string {
	return `${tokenHeader}:${token}:${fileUrl}`;
}

/**
 * Revoke every cached CollectionXiewer blob URL and clear the map.
 * Call on plugin unload and whenever the session token rotates.
 * Do **not** call on gallery leaf unload — the cache is shared across notes.
 */
export function revokeXiewerObjectUrls(): void {
	for (const url of objectUrlCache.values()) URL.revokeObjectURL(url);
	objectUrlCache.clear();
}

/** Forget the remembered session token (tests / unload). Does not revoke blobs by itself. */
export function clearXiewerSessionMemory(): void {
	lastKnownToken = null;
}

/**
 * If `token` differs from the last known good token, revoke all blob URLs and adopt it.
 * Returns true when a rotation (or first adopt) happened.
 */
export function noteXiewerSessionToken(token: string | null | undefined): boolean {
	const next = typeof token === "string" ? token.trim() : "";
	if (!next) return false;
	if (lastKnownToken === next) return false;
	if (lastKnownToken !== null) {
		revokeXiewerObjectUrls();
	}
	lastKnownToken = next;
	return true;
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
		// Settings override wins over host/port in local-api.json (Carl may point at a non-default bind).
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

function resolveSearchRoot(preferredBaseUrl: string, session: LocalApiSession): string {
	const preferred = preferredBaseUrl.trim();
	return preferred ? normalizeBaseUrl(preferred) : session.baseUrl;
}

async function searchOnce(
	root: string,
	session: LocalApiSession,
	query: string,
	capped: number,
	signal: AbortSignal,
): Promise<{ items: XiewerSearchItem[]; session: LocalApiSession } | { error: string; status?: number }> {
	const url = `${root}/search?q=${encodeURIComponent(query)}&limit=${capped}`;

	const health = await fetch(`${root}/health`, { signal });
	if (!health.ok) {
		return {
			error: `CollectionXiewer is not reachable at ${root} (health HTTP ${health.status}). Is the app running?`,
		};
	}

	const response = await fetch(url, {
		signal,
		headers: authHeaders(session),
	});
	if (response.status === 401) {
		return {
			error:
				"CollectionXiewer rejected the API token (401). Restart CollectionXiewer if it is not running, then reopen the note.",
			status: 401,
		};
	}

	const body = (await response.json()) as XiewerSearchResponse;
	if (!response.ok || !body.ok) {
		return {
			error: body.error ?? `CollectionXiewer search failed (HTTP ${response.status}).`,
		};
	}
	return { items: body.items ?? [], session: { ...session, baseUrl: root } };
}

/**
 * Search CollectionXiewer. On 401, re-read `local-api.json` once (Xiewer rewrites the
 * token on every start) and retry. Token rotation revokes stale blob URLs.
 */
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

	const root = resolveSearchRoot(preferredBaseUrl, session);
	const capped = limit ?? DEFAULT_XIEWER_LIMIT;
	const controller = new AbortController();
	const timer = window.setTimeout(() => controller.abort(), timeoutMs);

	try {
		const first = await searchOnce(root, session, query, capped, controller.signal);
		if (!("error" in first)) {
			noteXiewerSessionToken(first.session.token);
			return first;
		}

		if (first.status !== 401) {
			return { items: [], error: first.error };
		}

		// Auto re-read token file once — covers Xiewer restart without forcing a manual note reload.
		const refreshed = readLocalApiSession(preferredBaseUrl);
		if (!refreshed) {
			revokeXiewerObjectUrls();
			lastKnownToken = null;
			return { items: [], error: first.error };
		}

		noteXiewerSessionToken(refreshed.token);
		const retryRoot = resolveSearchRoot(preferredBaseUrl, refreshed);
		const second = await searchOnce(retryRoot, refreshed, query, capped, controller.signal);
		if ("error" in second) {
			return { items: [], error: second.error };
		}
		noteXiewerSessionToken(second.session.token);
		return second;
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

/**
 * Fetch an authenticated `/file/:id` into a blob: URL (img/video cannot send auth headers).
 * On 401, re-read the token file once, revoke stale blobs, and retry with the new token.
 */
export async function resolveXiewerObjectUrl(
	fileUrl: string,
	token: string,
	tokenHeader = DEFAULT_TOKEN_HEADER,
): Promise<string> {
	const tryFetch = async (activeToken: string, activeHeader: string): Promise<string> => {
		const cacheKey = objectUrlCacheKey(activeHeader, activeToken, fileUrl);
		const cached = objectUrlCache.get(cacheKey);
		if (cached) return cached;

		const response = await fetch(fileUrl, {
			headers: {
				[activeHeader]: activeToken,
				Authorization: `Bearer ${activeToken}`,
			},
		});
		if (response.status === 401) {
			const err = new Error("Unauthorized CollectionXiewer file request (stale token).") as Error & {
				status?: number;
			};
			err.status = 401;
			throw err;
		}
		if (!response.ok) {
			throw new Error(`CollectionXiewer file HTTP ${response.status}`);
		}
		const blob = await response.blob();
		const objectUrl = URL.createObjectURL(blob);
		objectUrlCache.set(cacheKey, objectUrl);
		noteXiewerSessionToken(activeToken);
		return objectUrl;
	};

	try {
		return await tryFetch(token, tokenHeader);
	} catch (err) {
		const status = err && typeof err === "object" && "status" in err ? (err as { status?: number }).status : undefined;
		if (status !== 401) throw err;

		const refreshed = readLocalApiSession();
		if (!refreshed || refreshed.token === token) {
			revokeXiewerObjectUrls();
			lastKnownToken = null;
			throw err;
		}

		noteXiewerSessionToken(refreshed.token);
		return tryFetch(refreshed.token, refreshed.tokenHeader);
	}
}

/** Test helper: current blob cache size. */
export function xiewerObjectUrlCacheSize(): number {
	return objectUrlCache.size;
}

/** Test helper: inject a cache entry without fetching. */
export function __testPutXiewerObjectUrl(cacheKey: string, objectUrl: string): void {
	objectUrlCache.set(cacheKey, objectUrl);
}
