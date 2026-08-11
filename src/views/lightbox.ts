import { App, Modal } from "obsidian";
import type { GalleryItem, MediaGallerySettings } from "../types";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 5;
const ZOOM_WHEEL_FACTOR = 1.1;
const ZOOM_BTN_STEP = 0.25;

export class LightboxModal extends Modal {
	private items: GalleryItem[];
	private index: number;
	private settings: MediaGallerySettings;
	private scale = 1;
	private translateX = 0;
	private translateY = 0;
	private isDragging = false;
	private dragStartX = 0;
	private dragStartY = 0;
	private dragOriginX = 0;
	private dragOriginY = 0;
	private mediaEl: HTMLImageElement | HTMLVideoElement | null = null;
	private panZoomEnabled = false;
	private viewportEl: HTMLElement | null = null;
	private transformEl: HTMLElement | null = null;
	private infoEl: HTMLElement | null = null;
	private disposers: Array<() => void> = [];

	constructor(app: App, items: GalleryItem[], index: number, settings: MediaGallerySettings) {
		super(app);
		this.items = items;
		this.index = index;
		this.settings = settings;
	}

	onOpen(): void {
		const { contentEl, modalEl, containerEl } = this;
		containerEl.addClass("mg-lightbox-modal-container");
		modalEl.addClass("mg-lightbox-modal");
		contentEl.addClass("mg-lightbox");
		contentEl.empty();

		const toolbar = contentEl.createDiv({ cls: "mg-lightbox-toolbar" });
		toolbar.createEl("button", { text: "−", cls: "mg-lightbox-btn", attr: { title: "Zoom out" } }).addEventListener(
			"click",
			() => this.adjustZoom(-ZOOM_BTN_STEP),
		);
		toolbar.createEl("button", { text: "+", cls: "mg-lightbox-btn", attr: { title: "Zoom in" } }).addEventListener(
			"click",
			() => this.adjustZoom(ZOOM_BTN_STEP),
		);
		toolbar
			.createEl("button", { text: "Reset", cls: "mg-lightbox-btn", attr: { title: "Reset zoom and pan" } })
			.addEventListener("click", () => this.resetTransform());
		toolbar.createEl("button", { text: "Close", cls: "mg-lightbox-btn" }).addEventListener("click", () =>
			this.close(),
		);

		const stage = contentEl.createDiv({ cls: "mg-lightbox-stage" });
		this.viewportEl = stage.createDiv({ cls: "mg-lightbox-viewport" });
		this.transformEl = this.viewportEl.createDiv({ cls: "mg-lightbox-transform" });
		this.infoEl = stage.createDiv({ cls: "mg-lightbox-info" });

		const nav = contentEl.createDiv({ cls: "mg-lightbox-nav" });
		nav.createEl("button", { text: "← Prev", cls: "mg-lightbox-nav-btn" }).addEventListener("click", () =>
			this.show(this.index - 1),
		);
		nav.createEl("button", { text: "Next →", cls: "mg-lightbox-nav-btn" }).addEventListener("click", () =>
			this.show(this.index + 1),
		);

		this.setupPanZoom();
		this.renderItem();

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

	private setupPanZoom(): void {
		const viewport = this.viewportEl;
		if (!viewport) return;

		const onWheel = (event: WheelEvent): void => {
			if (!this.panZoomEnabled || !(this.mediaEl instanceof HTMLImageElement)) return;
			event.preventDefault();
			const factor = event.deltaY < 0 ? ZOOM_WHEEL_FACTOR : 1 / ZOOM_WHEEL_FACTOR;
			this.setZoom(this.scale * factor);
		};
		viewport.addEventListener("wheel", onWheel, { passive: false });
		this.disposers.push(() => viewport.removeEventListener("wheel", onWheel));

		const onMouseDown = (event: MouseEvent): void => {
			if (!this.canPan() || event.button !== 0) return;
			event.preventDefault();
			this.isDragging = true;
			this.dragStartX = event.clientX;
			this.dragStartY = event.clientY;
			this.dragOriginX = this.translateX;
			this.dragOriginY = this.translateY;
			this.updateCursor();
		};
		viewport.addEventListener("mousedown", onMouseDown);
		this.disposers.push(() => viewport.removeEventListener("mousedown", onMouseDown));

		const onMouseMove = (event: MouseEvent): void => {
			if (!this.isDragging) return;
			this.translateX = this.dragOriginX + (event.clientX - this.dragStartX);
			this.translateY = this.dragOriginY + (event.clientY - this.dragStartY);
			this.clampTranslate();
			this.applyTransform(false);
		};
		window.addEventListener("mousemove", onMouseMove);
		this.disposers.push(() => window.removeEventListener("mousemove", onMouseMove));

		const onMouseUp = (): void => {
			if (!this.isDragging) return;
			this.isDragging = false;
			this.updateCursor();
		};
		window.addEventListener("mouseup", onMouseUp);
		this.disposers.push(() => window.removeEventListener("mouseup", onMouseUp));
	}

	private renderItem(): void {
		const transform = this.transformEl;
		const info = this.infoEl;
		if (!transform || !info) return;

		transform.empty();
		info.empty();
		this.resetTransform(false);

		const item = this.items[this.index];
		if (!item) return;

		if (item.mediaKind === "video") {
			this.panZoomEnabled = false;
			this.mediaEl = transform.createEl("video", {
				attr: { src: item.src, controls: "", autoplay: "", playsinline: "" },
			});
		} else {
			this.panZoomEnabled = true;
			this.mediaEl = transform.createEl("img", {
				attr: { src: item.src, alt: item.name, draggable: "false" },
			});
			this.mediaEl.addEventListener("click", (event) => {
				event.stopPropagation();
			});
			this.mediaEl.addEventListener("load", () => {
				this.clampTranslate();
				this.applyTransform();
			});
		}

		if (this.settings.showCaptions && item.caption) {
			info.createDiv({ cls: "mg-lightbox-caption", text: item.caption });
		}
		info.createDiv({
			cls: "mg-lightbox-meta",
			text: `${this.index + 1} / ${this.items.length} — ${item.name}`,
		});
	}

	private getBaseSize(): { width: number; height: number } | null {
		if (!(this.mediaEl instanceof HTMLImageElement)) return null;
		const { offsetWidth, offsetHeight } = this.mediaEl;
		if (offsetWidth <= 0 || offsetHeight <= 0) return null;
		return { width: offsetWidth, height: offsetHeight };
	}

	private getViewportSize(): { width: number; height: number } {
		const viewport = this.viewportEl;
		return {
			width: viewport?.clientWidth ?? 0,
			height: viewport?.clientHeight ?? 0,
		};
	}

	private getOverflow(): { x: number; y: number } {
		const base = this.getBaseSize();
		const viewport = this.getViewportSize();
		if (!base || viewport.width <= 0 || viewport.height <= 0) {
			return { x: 0, y: 0 };
		}

		const scaledWidth = base.width * this.scale;
		const scaledHeight = base.height * this.scale;
		return {
			x: Math.max(0, scaledWidth - viewport.width),
			y: Math.max(0, scaledHeight - viewport.height),
		};
	}

	/** Pan only when zoomed content actually exceeds the viewport on at least one axis. */
	private canPan(): boolean {
		if (!this.panZoomEnabled) return false;
		const overflow = this.getOverflow();
		return overflow.x > 1 || overflow.y > 1;
	}

	private clampTranslate(): void {
		if (!this.canPan()) {
			this.translateX = 0;
			this.translateY = 0;
			return;
		}

		const overflow = this.getOverflow();
		const maxX = overflow.x / 2;
		const maxY = overflow.y / 2;
		this.translateX = Math.min(maxX, Math.max(-maxX, this.translateX));
		this.translateY = Math.min(maxY, Math.max(-maxY, this.translateY));
	}

	private show(nextIndex: number): void {
		if (this.items.length === 0) return;
		this.index = (nextIndex + this.items.length) % this.items.length;
		this.renderItem();
	}

	private clampZoom(value: number): number {
		return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
	}

	private setZoom(nextScale: number): void {
		this.scale = this.clampZoom(nextScale);
		this.clampTranslate();
		this.applyTransform();
	}

	private adjustZoom(delta: number): void {
		if (!this.panZoomEnabled) return;
		this.setZoom(this.scale + delta);
	}

	private resetTransform(apply = true): void {
		this.scale = 1;
		this.translateX = 0;
		this.translateY = 0;
		this.isDragging = false;
		if (apply) this.applyTransform();
	}

	private applyTransform(updateCursor = true): void {
		if (!this.transformEl) return;
		this.transformEl.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
		if (updateCursor) this.updateCursor();
	}

	private updateCursor(): void {
		if (!this.viewportEl) return;
		if (!this.canPan()) {
			this.viewportEl.style.cursor = "default";
			return;
		}
		this.viewportEl.style.cursor = this.isDragging ? "grabbing" : "grab";
	}

	onClose(): void {
		for (const dispose of this.disposers) dispose();
		this.disposers = [];
		this.contentEl.empty();
		this.containerEl.removeClass("mg-lightbox-modal-container");
		this.modalEl.removeClass("mg-lightbox-modal");
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
