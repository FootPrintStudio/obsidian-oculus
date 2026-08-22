import { App, Platform, TFile, TFolder } from "obsidian";
import { applyGallerySort } from "./gallerySort";
import { isMediaExtendedAvailable } from "./mediaExtended";
import { mediaTitleMatchesQueries } from "./searchQuery";
import type {
	GalleryItem,
	MediaFilter,
	MediaGallerySettings,
	MediaKind,
	ParsedGalleryBlock,
	ResolveWarning,
	UrlMediaEntry,
} from "./types";
import { IMAGE_EXTENSIONS, VIDEO_EXTENSIONS } from "./types";
import {
	contentTypeToMediaKind,
	genericHostedPosterUrl,
	hostedPlatformDisplayName,
	hostedPlatformPosterUrl,
	inferUrlMediaKind,
	isHostedMediaUrl,
	probeUrlContentType,
	urlDisplayName,
} from "./urlMedia";
import {
	fetchXiewerSearch,
	xiewerFileUrl,
	xiewerKindAllows,
	xiewerMediaKind,
} from "./xiewerClient";

function extensionKind(ext: string): MediaKind | null {
	const lower = ext.toLowerCase();
	if (IMAGE_EXTENSIONS.has(lower)) return "image";
	if (VIDEO_EXTENSIONS.has(lower)) return "video";
	return null;
}

function filterAllows(kind: MediaKind, filter: MediaFilter): boolean {
	if (filter === "all") return true;
	if (filter === "images") return kind === "image";
	return kind === "video";
}

function fileToItem(app: App, file: TFile, caption?: string): GalleryItem {
	return {
		id: file.path,
		mediaKind: extensionKind(file.extension) ?? "image",
		source: "local",
		path: file.path,
		caption,
		src: app.vault.getResourcePath(file),
		name: file.name,
		mtime: file.stat.mtime,
	};
}

function scanFolder(
	app: App,
	folderPath: string,
	recursive: boolean,
	filter: MediaFilter,
	titleQueries?: string[],
): TFile[] {
	const folder = app.vault.getAbstractFileByPath(folderPath);
	if (!folder || !(folder instanceof TFolder)) return [];

	const results: TFile[] = [];

	const walk = (current: TFolder): void => {
		for (const child of current.children) {
			if (child instanceof TFile) {
				const kind = extensionKind(child.extension);
				if (
					kind &&
					filterAllows(kind, filter) &&
					(!titleQueries || mediaTitleMatchesQueries(child.basename, titleQueries))
				) {
					results.push(child);
				}
			} else if (recursive && child instanceof TFolder) {
				walk(child);
			}
		}
	};

	walk(folder);
	return results.sort((a, b) => a.path.localeCompare(b.path));
}

async function resolveUrlEntry(
	app: App,
	entry: UrlMediaEntry,
	settings: MediaGallerySettings,
	filter: MediaFilter,
): Promise<{ item?: GalleryItem; warning?: ResolveWarning }> {
	if (!settings.allowRemoteImages) {
		return {
			warning: {
				line: entry.line,
				message: "Remote media disabled in plugin settings.",
			},
		};
	}

	if (isHostedMediaUrl(entry.url)) {
		if (!Platform.isDesktopApp || !isMediaExtendedAvailable(app)) {
			return {
				warning: {
					line: entry.line,
					message:
						"Hosted platform URLs (YouTube, Vimeo, Bilibili, Coursera, etc.) require Media Extended on desktop.",
				},
			};
		}

		if (!filterAllows("video", filter)) {
			return {};
		}

		return {
			item: {
				id: entry.url,
				mediaKind: "video",
				source: "url",
				url: entry.url,
				urlVariant: "hosted",
				caption: entry.caption,
				src: hostedPlatformPosterUrl(entry.url) ?? genericHostedPosterUrl(),
				name: hostedPlatformDisplayName(entry.url),
			},
		};
	}

	let kind = inferUrlMediaKind(entry.url);

	if (settings.validateRemoteContentType) {
		const contentType = await probeUrlContentType(entry.url, settings.remoteLoadTimeoutMs);
		if (!contentType) {
			return {
				warning: {
					line: entry.line,
					message: `Could not determine Content-Type for URL (timeout or blocked): ${entry.url}`,
				},
			};
		}

		const probedKind = contentTypeToMediaKind(contentType);
		if (!probedKind) {
			return {
				warning: {
					line: entry.line,
					message: `URL is not an image or video (Content-Type: ${contentType}).`,
				},
			};
		}

		kind = probedKind;
	}

	if (!kind) {
		return {
			warning: {
				line: entry.line,
				message: `Unsupported URL type (no recognized image/video extension): ${entry.url}`,
			},
		};
	}

	if (!filterAllows(kind, filter)) {
		return {};
	}

	return {
		item: {
			id: entry.url,
			mediaKind: kind,
			source: "url",
			url: entry.url,
			urlVariant: "direct",
			caption: entry.caption,
			src: entry.url,
			name: urlDisplayName(entry.url),
		},
	};
}

export async function resolveGalleryItems(
	app: App,
	block: ParsedGalleryBlock,
	settings: MediaGallerySettings,
): Promise<{ items: GalleryItem[]; warnings: ResolveWarning[] }> {
	const items: GalleryItem[] = [];
	const warnings: ResolveWarning[] = [];
	const seen = new Set<string>();

	const addItem = (item: GalleryItem): void => {
		if (seen.has(item.id)) return;
		seen.add(item.id);
		items.push(item);
	};

	for (const entry of block.entries) {
		if (entry.kind === "url") {
			const resolved = await resolveUrlEntry(app, entry, settings, block.filter);
			if (resolved.warning) warnings.push(resolved.warning);
			if (resolved.item) addItem(resolved.item);
			continue;
		}

		if (entry.kind === "xiewer") {
			const result = await fetchXiewerSearch(
				settings.collectionXiewerBaseUrl,
				entry.query,
				block.limit,
				settings.remoteLoadTimeoutMs,
			);
			if (result.error) {
				warnings.push({ line: entry.line, message: result.error });
				continue;
			}
			let matched = 0;
			for (const hit of result.items) {
				if (!xiewerKindAllows(hit.kind, block.filter)) continue;
				matched += 1;
				addItem({
					id: `xiewer:${hit.id}`,
					mediaKind: xiewerMediaKind(hit.kind),
					source: "xiewer",
					path: hit.path,
					url: xiewerFileUrl(settings.collectionXiewerBaseUrl, hit.id),
					urlVariant: "direct",
					src: xiewerFileUrl(settings.collectionXiewerBaseUrl, hit.id),
					name: hit.name,
					mtime: hit.mtime,
				});
			}
			if (matched === 0) {
				warnings.push({
					line: entry.line,
					message: `No matching CollectionXiewer media for query: ${entry.query}`,
				});
			}
			continue;
		}

		if (entry.kind === "search") {
			const folder = app.vault.getAbstractFileByPath(entry.path);
			if (!folder) {
				warnings.push({
					line: entry.line,
					message: `Search folder not found: ${entry.path}`,
				});
				continue;
			}
			if (!(folder instanceof TFolder)) {
				warnings.push({
					line: entry.line,
					message: `Search path is not a folder: ${entry.path}`,
				});
				continue;
			}

			let files = scanFolder(app, folder.path, entry.recursive, block.filter, entry.queries);
			if (block.limit != null) files = files.slice(0, block.limit);
			if (files.length === 0) {
				warnings.push({
					line: entry.line,
					message: `No matching media for title queries "${entry.queries.join(", ")}" in folder: ${folder.path} (filter: ${block.filter})`,
				});
			}
			for (const file of files) addItem(fileToItem(app, file));
			continue;
		}

		const abstract = app.vault.getAbstractFileByPath(entry.path);
		if (abstract instanceof TFile) {
			const kind = extensionKind(abstract.extension);
			if (!kind) {
				warnings.push({
					line: entry.line,
					message: `Unsupported file type: ${abstract.path}`,
				});
				continue;
			}
			addItem(fileToItem(app, abstract, entry.caption));
			continue;
		}

		if (abstract instanceof TFolder || entry.recursive) {
			const folderPath =
				abstract instanceof TFolder ? abstract.path : entry.path.replace(/\/+$/, "");
			if (!app.vault.getAbstractFileByPath(folderPath)) {
				warnings.push({
					line: entry.line,
					message: `Folder not found: ${folderPath}`,
				});
				continue;
			}
			const files = scanFolder(app, folderPath, entry.recursive, block.filter);
			if (files.length === 0) {
				warnings.push({
					line: entry.line,
					message: `No matching media in folder: ${folderPath}`,
				});
			}
			for (const file of files) {
				addItem(fileToItem(app, file, entry.caption));
			}
			continue;
		}

		warnings.push({ line: entry.line, message: `Path not found: ${entry.path}` });
	}

	applyGallerySort(items, block.sort);
	return { items, warnings };
}
