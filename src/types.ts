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
	/** When Media Extended is installed, open local/direct URL videos in its player. Hosted URLs always use ME. */
	useMediaExtendedPlayback: boolean;
}

export const DEFAULT_SETTINGS: MediaGallerySettings = {
	allowRemoteImages: true,
	remoteLoadTimeoutMs: 30000,
	validateRemoteContentType: false,
	showCaptions: true,
	captionMaxLines: 2,
	defaultView: "grid",
	useMediaExtendedPlayback: true,
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

export interface SearchMediaEntry {
	kind: "search";
	path: string;
	recursive: boolean;
	query: string;
	line: number;
}

export type MediaEntry = LocalMediaEntry | SearchMediaEntry | UrlMediaEntry;

export interface ParsedGalleryBlock {
	view: GalleryViewType;
	filter: MediaFilter;
	/** Grid column template; only used when view is `grid`. Values: `auto`, a number, or raw CSS. */
	gridColumns: string;
	/** Thumbnail column template; only used when view is `thumbnails`. Values: `auto`, a number, or raw CSS. */
	thumbnailColumns: string;
	/** Carousel main stage height in px; null uses default (420). */
	carouselHeightPx: number | null;
	/** Show thumbnail strip under carousel main view. */
	carouselShowThumbnails: boolean;
	/** Horizontal masonry target row height in px; null uses default (200). */
	masonryRowHeightPx: number | null;
	/** Vertical masonry column width; `auto`, a number, `200px`, or minmax CSS. */
	masonryColumnWidth: string;
	entries: MediaEntry[];
	errors: ParseError[];
}

export type UrlVariant = "direct" | "hosted";

export interface GalleryItem {
	id: string;
	mediaKind: MediaKind;
	source: "local" | "url";
	path?: string;
	url?: string;
	/** Distinguishes direct file URLs from hosted platform links (YouTube, etc.). */
	urlVariant?: UrlVariant;
	caption?: string;
	src: string;
	name: string;
}

export interface ResolveWarning {
	line: number;
	message: string;
}
