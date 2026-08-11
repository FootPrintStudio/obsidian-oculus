import { App, TFile, TFolder } from "obsidian";
import type {
	GalleryItem,
	MediaFilter,
	MediaGallerySettings,
	MediaKind,
	ParsedGalleryBlock,
	ResolveWarning,
} from "./types";
import { IMAGE_EXTENSIONS, VIDEO_EXTENSIONS } from "./types";

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
	};
}

function scanFolder(
	app: App,
	folderPath: string,
	recursive: boolean,
	filter: MediaFilter,
): TFile[] {
	const folder = app.vault.getAbstractFileByPath(folderPath);
	if (!folder || !(folder instanceof TFolder)) return [];

	const results: TFile[] = [];

	const walk = (current: TFolder): void => {
		for (const child of current.children) {
			if (child instanceof TFile) {
				const kind = extensionKind(child.extension);
				if (kind && filterAllows(kind, filter)) results.push(child);
			} else if (recursive && child instanceof TFolder) {
				walk(child);
			}
		}
	};

	walk(folder);
	return results.sort((a, b) => a.path.localeCompare(b.path));
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
			if (!settings.allowRemoteImages) {
				warnings.push({
					line: entry.line,
					message: "Remote images disabled in plugin settings.",
				});
				continue;
			}
			addItem({
				id: entry.url,
				mediaKind: "image",
				source: "url",
				url: entry.url,
				caption: entry.caption,
				src: entry.url,
				name: entry.url.split("/").pop() ?? entry.url,
			});
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

		if (abstract instanceof TFolder || entry.recursive || entry.path.endsWith("/")) {
			const folderPath =
				abstract instanceof TFolder ? abstract.path : entry.path.replace(/\/$/, "");
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

	return { items, warnings };
}
