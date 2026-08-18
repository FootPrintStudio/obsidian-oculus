import type { Plugin } from "obsidian";
import type { GalleryItem, MediaGallerySettings } from "./types";
import { IMAGE_EXTENSIONS } from "./types";
import { openLightbox } from "./views/lightbox";

const NATIVE_VIEWER_EVENTS = ["click", "mousedown", "dblclick", "pointerdown"] as const;

const SKIP_ANCESTOR =
	".mg-block, .mg-lightbox, .mg-lightbox-modal, .mg-builder-modal, .modal, .prompt, .menu, .suggestion-container, .workspace-tab-header, .nav-files-container, .tree-item, .setting-item, .clickable-icon, pre, code";

const MARKDOWN_ROOT =
	".markdown-preview-view, .markdown-source-view, .markdown-rendered, .markdown-embed, .cm-editor";

function isModifierClick(event: MouseEvent): boolean {
	return event.metaKey || event.ctrlKey || event.altKey || event.shiftKey;
}

function markdownRootFor(el: Element): HTMLElement | null {
	return el.closest(MARKDOWN_ROOT);
}

function isEligibleImage(img: HTMLImageElement): boolean {
	if (!img.src) return false;
	if (img.closest(SKIP_ANCESTOR)) return false;
	if (!markdownRootFor(img)) return false;
	if (img.closest("video")) return false;
	return true;
}

function imageFromEventTarget(target: EventTarget | null): HTMLImageElement | null {
	if (!(target instanceof Element)) return null;
	if (target instanceof HTMLImageElement && isEligibleImage(target)) return target;

	const embed = target.closest(".image-embed, .internal-embed.media-embed, .media-embed");
	if (!embed || embed.closest(SKIP_ANCESTOR)) return null;
	if (embed.querySelector("video")) return null;
	const img = embed.querySelector("img");
	if (img instanceof HTMLImageElement && isEligibleImage(img)) return img;
	return null;
}

function itemFromImage(img: HTMLImageElement, index: number): GalleryItem {
	const embed = img.closest(".internal-embed, .image-embed, .media-embed");
	const embedSrc = embed?.getAttribute("src")?.trim() ?? "";
	const alt = img.getAttribute("alt")?.trim() ?? "";
	const nameFromPath = embedSrc.split("/").pop() || embedSrc;
	const name = nameFromPath || alt || `Image ${index + 1}`;
	const isRemote = /^https?:\/\//i.test(img.src) || /^https?:\/\//i.test(embedSrc);
	const looksLikeImagePath = IMAGE_EXTENSIONS.has(
		(embedSrc.split(".").pop() ?? "").toLowerCase(),
	);

	return {
		id: `${img.src}#${index}`,
		mediaKind: "image",
		source: isRemote ? "url" : "local",
		path: !isRemote && looksLikeImagePath ? embedSrc : undefined,
		url: isRemote ? embedSrc || img.src : undefined,
		urlVariant: isRemote ? "direct" : undefined,
		caption: alt || undefined,
		src: img.src,
		name,
	};
}

function collectNoteImages(img: HTMLImageElement): { items: GalleryItem[]; index: number } {
	const root = markdownRootFor(img);
	if (!root) {
		const item = itemFromImage(img, 0);
		return { items: [item], index: 0 };
	}

	const images = Array.from(root.querySelectorAll("img")).filter(isEligibleImage);
	const items = images.map((el, i) => itemFromImage(el, i));
	const index = Math.max(0, images.indexOf(img));
	return { items, index };
}

function stopNativeViewer(event: Event): void {
	event.preventDefault();
	event.stopPropagation();
	event.stopImmediatePropagation();
}

export function registerMarkdownImageLightbox(
	plugin: Plugin,
	getSettings: () => MediaGallerySettings,
): void {
	const onEvent = (event: Event): void => {
		if (!(event instanceof MouseEvent)) return;
		if (event.button !== 0) return;
		if (isModifierClick(event)) return;
		if (!getSettings().lightboxMarkdownImages) return;

		const img = imageFromEventTarget(event.target);
		if (!img) return;

		stopNativeViewer(event);
		if (event.type !== "click") return;

		const { items, index } = collectNoteImages(img);
		if (items.length === 0) return;
		openLightbox(plugin.app, items, index, getSettings());
	};

	for (const type of NATIVE_VIEWER_EVENTS) {
		plugin.registerDomEvent(document, type, onEvent, { capture: true });
	}
}
