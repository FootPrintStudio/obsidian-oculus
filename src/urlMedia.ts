import { requestUrl } from "obsidian";
import { IMAGE_EXTENSIONS, VIDEO_EXTENSIONS, type MediaKind } from "./types";

/** Extract pathname extension from a URL, ignoring query/hash. */
export function urlExtension(url: string): string | null {
	try {
		const pathname = new URL(url).pathname;
		const base = pathname.split("/").pop() ?? "";
		const dot = base.lastIndexOf(".");
		if (dot <= 0) return null;
		return base.slice(dot + 1).toLowerCase();
	} catch {
		return null;
	}
}

/** Infer image/video from URL path extension. Returns null when unknown. */
export function inferUrlMediaKind(url: string): MediaKind | null {
	const ext = urlExtension(url);
	if (!ext) return null;
	if (IMAGE_EXTENSIONS.has(ext)) return "image";
	if (VIDEO_EXTENSIONS.has(ext)) return "video";
	return null;
}

type HostedPlatform = "youtube" | "vimeo" | "bilibili" | "coursera" | "unknown";

function parseHostedPlatform(url: string): { platform: HostedPlatform; host: string } {
	try {
		const parsed = new URL(url);
		const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
		if (host === "youtu.be" || host.endsWith("youtube.com")) return { platform: "youtube", host };
		if (host.endsWith("vimeo.com")) return { platform: "vimeo", host };
		if (host.endsWith("bilibili.com") || host.endsWith("bilibili.tv")) {
			return { platform: "bilibili", host };
		}
		if (host.endsWith("coursera.org")) return { platform: "coursera", host };
		return { platform: "unknown", host };
	} catch {
		return { platform: "unknown", host: "" };
	}
}

/** Hosted platform URLs (YouTube, Vimeo, Bilibili, Coursera, etc.). */
export function isHostedMediaUrl(url: string): boolean {
	const { platform } = parseHostedPlatform(url);
	return platform !== "unknown";
}

export function youtubeVideoId(url: string): string | null {
	try {
		const parsed = new URL(url);
		const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
		if (host === "youtu.be") {
			const id = parsed.pathname.split("/").filter(Boolean)[0];
			return id && id.length >= 6 ? id : null;
		}
		if (!host.endsWith("youtube.com")) return null;

		const fromQuery = parsed.searchParams.get("v");
		if (fromQuery) return fromQuery;

		const parts = parsed.pathname.split("/").filter(Boolean);
		const marker = parts[0];
		if (marker === "shorts" || marker === "embed" || marker === "live" || marker === "v") {
			const id = parts[1];
			return id && id.length >= 6 ? id : null;
		}
		return null;
	} catch {
		return null;
	}
}

export function vimeoVideoId(url: string): string | null {
	try {
		const parsed = new URL(url);
		const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
		if (!host.endsWith("vimeo.com")) return null;

		const parts = parsed.pathname.split("/").filter(Boolean);
		if (parts[0] === "video" && parts[1] && /^\d+$/.test(parts[1])) return parts[1];
		if (parts[0] && /^\d+$/.test(parts[0])) return parts[0];
		return null;
	} catch {
		return null;
	}
}

/** Platform thumbnail URL when available; null uses generic poster fallback. */
export function hostedPlatformPosterUrl(url: string): string | null {
	const { platform } = parseHostedPlatform(url);
	if (platform === "youtube") {
		const id = youtubeVideoId(url);
		return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
	}
	if (platform === "vimeo") {
		const id = vimeoVideoId(url);
		return id ? `https://vumbnail.com/${id}.jpg` : null;
	}
	return null;
}

/** Inline SVG poster for hosted videos without a platform thumbnail. */
export function genericHostedPosterUrl(): string {
	const svg =
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" aria-label="Video">' +
		'<rect width="640" height="360" fill="#1a1a1e"/>' +
		'<circle cx="320" cy="180" r="52" fill="rgba(255,255,255,0.92)"/>' +
		'<path d="M305 150l48 30-48 30z" fill="#1a1a1e"/>' +
		"</svg>";
	return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function hostedPlatformDisplayName(url: string): string {
	const { platform, host } = parseHostedPlatform(url);
	switch (platform) {
		case "youtube":
			return "YouTube";
		case "vimeo":
			return "Vimeo";
		case "bilibili":
			return "Bilibili";
		case "coursera":
			return "Coursera";
		default:
			return host || urlDisplayName(url);
	}
}

export function contentTypeToMediaKind(contentType: string): MediaKind | null {
	const main = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
	if (main.startsWith("image/")) return "image";
	if (main.startsWith("video/")) return "video";
	return null;
}

function readContentTypeHeader(headers: Record<string, string> | undefined): string | null {
	if (!headers) return null;
	for (const [key, value] of Object.entries(headers)) {
		if (key.toLowerCase() === "content-type" && value) return value;
	}
	return null;
}

/** Probe remote Content-Type via HEAD, falling back to a short GET. */
export async function probeUrlContentType(url: string, timeoutMs: number): Promise<string | null> {
	const probe = async (method: "HEAD" | "GET"): Promise<string | null> => {
		const response = await requestUrl({ url, method, throw: false });
		if (response.status < 200 || response.status >= 400) return null;
		return readContentTypeHeader(response.headers);
	};

	const timeout = Math.max(1000, timeoutMs);
	const raced = <T>(promise: Promise<T>): Promise<T | null> =>
		Promise.race([
			promise,
			new Promise<null>((resolve) => window.setTimeout(() => resolve(null), timeout)),
		]);

	const headType = await raced(probe("HEAD"));
	if (headType) return headType;
	return raced(probe("GET"));
}

export function urlDisplayName(url: string): string {
	try {
		const pathname = new URL(url).pathname;
		const base = pathname.split("/").pop() ?? url;
		return base.split("?")[0]?.split("#")[0] ?? url;
	} catch {
		const tail = url.split("/").pop() ?? url;
		return tail.split("?")[0]?.split("#")[0] ?? url;
	}
}

/** Human-readable hint for builder UI and docs. */
export function describeUrlMediaEntry(url: string): string {
	const trimmed = url.trim();
	if (!trimmed) {
		return "Image URL, direct video (.mp4/.webm/.mov), or hosted link (YouTube, Vimeo, Bilibili, Coursera).";
	}

	if (isHostedMediaUrl(trimmed)) {
		return `Hosted video (${hostedPlatformDisplayName(trimmed)}) — requires Media Extended on desktop.`;
	}

	const kind = inferUrlMediaKind(trimmed);
	if (kind === "video") return "Direct video URL — plays in Media Extended or the lightbox.";
	if (kind === "image") return "Remote image URL.";
	return "Unrecognized URL — add a file extension or enable Content-Type validation in plugin settings.";
}
