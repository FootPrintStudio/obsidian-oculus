import { App, Modal } from "obsidian";
import type { GalleryItem, MediaGallerySettings } from "../types";

export class LightboxModal extends Modal {
	private items: GalleryItem[];
	private index: number;
	private settings: MediaGallerySettings;
	private zoom = 1;
	private mediaEl: HTMLImageElement | HTMLVideoElement | null = null;

	constructor(app: App, items: GalleryItem[], index: number, settings: MediaGallerySettings) {
		super(app);
		this.items = items;
		this.index = index;
		this.settings = settings;
	}

	onOpen(): void {
		const { contentEl, modalEl } = this;
		modalEl.addClass("mg-lightbox-modal");
		contentEl.addClass("mg-lightbox");

		const toolbar = contentEl.createDiv({ cls: "mg-lightbox-toolbar" });
		toolbar.createEl("button", { text: "−", cls: "mg-lightbox-btn" }).addEventListener("click", () => {
			this.zoom = Math.max(0.5, this.zoom - 0.25);
			this.applyZoom();
		});
		toolbar.createEl("button", { text: "+", cls: "mg-lightbox-btn" }).addEventListener("click", () => {
			this.zoom = Math.min(3, this.zoom + 0.25);
			this.applyZoom();
		});
		toolbar.createEl("button", { text: "Close", cls: "mg-lightbox-btn" }).addEventListener("click", () =>
			this.close(),
		);

		const stage = contentEl.createDiv({ cls: "mg-lightbox-stage" });
		const nav = contentEl.createDiv({ cls: "mg-lightbox-nav" });
		nav.createEl("button", { text: "← Prev", cls: "mg-lightbox-nav-btn" }).addEventListener("click", () =>
			this.show(this.index - 1),
		);
		nav.createEl("button", { text: "Next →", cls: "mg-lightbox-nav-btn" }).addEventListener("click", () =>
			this.show(this.index + 1),
		);

		this.renderItem(stage);
		this.scope.register([], "Escape", () => {
			this.close();
			return false;
		});
		this.scope.register([], "ArrowLeft", () => {
			this.show(this.index - 1);
			return false;
		});
		this.scope.register([], "ArrowRight", () => {
			this.show(this.index + 1);
			return false;
		});
	}

	private renderItem(stage: HTMLElement): void {
		stage.empty();
		this.zoom = 1;
		const item = this.items[this.index];
		if (!item) return;

		const wrap = stage.createDiv({ cls: "mg-lightbox-media-wrap" });
		if (item.mediaKind === "video") {
			this.mediaEl = wrap.createEl("video", {
				attr: { src: item.src, controls: "", autoplay: "", playsinline: "" },
			});
		} else {
			this.mediaEl = wrap.createEl("img", { attr: { src: item.src, alt: item.name } });
		}

		if (this.settings.showCaptions && item.caption) {
			stage.createDiv({ cls: "mg-lightbox-caption", text: item.caption });
		}
		stage.createDiv({
			cls: "mg-lightbox-meta",
			text: `${this.index + 1} / ${this.items.length} — ${item.name}`,
		});
	}

	private show(nextIndex: number): void {
		if (this.items.length === 0) return;
		this.index = (nextIndex + this.items.length) % this.items.length;
		const stage = this.contentEl.querySelector(".mg-lightbox-stage");
		if (stage instanceof HTMLElement) this.renderItem(stage);
	}

	private applyZoom(): void {
		if (this.mediaEl instanceof HTMLImageElement) {
			this.mediaEl.style.transform = `scale(${this.zoom})`;
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

export function openLightbox(
	app: App,
	items: GalleryItem[],
	index: number,
	settings: MediaGallerySettings,
): void {
	new LightboxModal(app, items, index, settings).open();
}
