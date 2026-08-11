export type GalleryViewType =
	| "grid"
	| "thumbnails"
	| "carousel"
	| "masonry-h"
	| "masonry-v";

export type MediaFilter = "images" | "video" | "all";

export type MediaKind = "image" | "video";

export interface MediaGallerySettings {
	allowRemoteImages: boolean;
	remoteLoadTimeoutMs: number;
	validateRemoteContentType: boolean;
	showCaptions: boolean;
	captionMaxLines: number;
	defaultView: GalleryViewType;
	gridColumns: string;
}

export const DEFAULT_SETTINGS: MediaGallerySettings = {
	allowRemoteImages: true,
	remoteLoadTimeoutMs: 30000,
	validateRemoteContentType: false,
	showCaptions: true,
	captionMaxLines: 2,
	defaultView: "grid",
	gridColumns: "auto",
};

export const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);
export const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov"]);

export const VIEW_TYPES: GalleryViewType[] = [
	"grid",
	"thumbnails",
	"carousel",
	"masonry-h",
	"masonry-v",
];

export const MEDIA_FILTERS: MediaFilter[] = ["images", "video", "all"];

export interface ParseError {
	line: number;
	message: string;
}

export interface LocalMediaEntry {
	kind: "local";
	path: string;
	recursive: boolean;
	caption?: string;
	line: number;
}

export interface UrlMediaEntry {
	kind: "url";
	url: string;
	caption?: string;
	line: number;
}

export type MediaEntry = LocalMediaEntry | UrlMediaEntry;

export interface ParsedGalleryBlock {
	view: GalleryViewType;
	filter: MediaFilter;
	entries: MediaEntry[];
	errors: ParseError[];
}

export interface GalleryItem {
	id: string;
	mediaKind: MediaKind;
	source: "local" | "url";
	path?: string;
	url?: string;
	caption?: string;
	src: string;
	name: string;
}

export interface ResolveWarning {
	line: number;
	message: string;
}
