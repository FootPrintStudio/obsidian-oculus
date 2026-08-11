import { App, Modal, Notice, Setting } from "obsidian";
import type { Editor } from "obsidian";
import { formatMediaGalleryBlock } from "./parseBlock";
import type MediaGalleryPlugin from "./main";
import { MEDIA_FILTERS, VIEW_TYPES, type GalleryViewType, type MediaFilter } from "./types";

interface LocalSource {
	kind: "local";
	path: string;
	recursive: boolean;
	caption: string;
}

interface UrlSource {
	kind: "url";
	url: string;
	caption: string;
}

type BuilderSource = LocalSource | UrlSource;

const VIEW_LABELS: Record<GalleryViewType, string> = {
	grid: "Grid",
	thumbnails: "Thumbnails",
	carousel: "Carousel",
	"masonry-h": "Masonry (horizontal)",
	"masonry-v": "Masonry (vertical)",
};

export class GalleryBuilderModal extends Modal {
	private plugin: MediaGalleryPlugin;
	private editor: Editor;
	private view: GalleryViewType;
	private filter: MediaFilter;
	private sources: BuilderSource[] = [];
	private previewEl: HTMLElement | null = null;
	private sourcesContainer: HTMLElement | null = null;

	constructor(app: App, plugin: MediaGalleryPlugin, editor: Editor) {
		super(app);
		this.plugin = plugin;
		this.editor = editor;
		this.view = plugin.settings.defaultView;
		this.filter = "images";
	}

	onOpen(): void {
		const { contentEl, modalEl } = this;
		modalEl.addClass("mg-builder-modal-container");
		contentEl.empty();
		contentEl.addClass("mg-builder-modal");

		const header = contentEl.createDiv({ cls: "mg-builder-header" });
		header.createEl("h2", { text: "Media Gallery builder" });
		header.createEl("p", {
			cls: "mg-builder-header-desc",
			text: "Configure view, filter, and media sources. Drag cards to reorder (or use arrows).",
		});

		const layoutSection = contentEl.createDiv({ cls: "mg-builder-section" });
		layoutSection.createDiv({ cls: "mg-builder-section-title", text: "1 — Layout" });

		new Setting(layoutSection)
			.setName("View")
			.setDesc("How the gallery is displayed in the note.")
			.addDropdown((dropdown) => {
				for (const view of VIEW_TYPES) dropdown.addOption(view, VIEW_LABELS[view]);
				dropdown.setValue(this.view).onChange((value) => {
					this.view = value as GalleryViewType;
					this.refreshPreview();
				});
			});

		new Setting(layoutSection)
			.setName("Filter")
			.setDesc("Applies to LOCAL folder scans only.")
			.addDropdown((dropdown) => {
				for (const filter of MEDIA_FILTERS) dropdown.addOption(filter, filter);
				dropdown.setValue(this.filter).onChange((value) => {
					this.filter = value as MediaFilter;
					this.refreshPreview();
				});
			});

		const sourcesSection = contentEl.createDiv({ cls: "mg-builder-section" });
		const sourcesHeader = sourcesSection.createDiv({ cls: "mg-builder-section-header" });
		sourcesHeader.createDiv({ cls: "mg-builder-section-title", text: "2 — Media sources" });

		const quickAdd = sourcesHeader.createDiv({ cls: "mg-builder-quick-add" });
		quickAdd
			.createEl("button", { cls: "mg-builder-pill", text: "+ Local path" })
			.addEventListener("click", () => this.addLocalSource());
		quickAdd
			.createEl("button", { cls: "mg-builder-pill", text: "+ URL" })
			.addEventListener("click", () => this.addUrlSource());

		this.sourcesContainer = sourcesSection.createDiv({ cls: "mg-builder-sources-list" });
		this.renderSources();

		const previewSection = contentEl.createDiv({ cls: "mg-builder-section" });
		const previewHeader = previewSection.createDiv({ cls: "mg-builder-section-header" });
		previewHeader.createDiv({ cls: "mg-builder-section-title", text: "3 — Preview" });

		const copyBtn = previewHeader.createEl("button", {
			cls: "mg-builder-copy-btn",
			text: "Copy block",
		});
		copyBtn.addEventListener("click", () => {
			const text = this.buildBlockText();
			void navigator.clipboard.writeText(text);
			new Notice("Media gallery block copied to clipboard.");
		});

		const previewBox = previewSection.createDiv({ cls: "mg-builder-preview-box" });
		previewBox.createDiv({ cls: "mg-builder-preview-lang", text: "media-gallery" });
		this.previewEl = previewBox.createEl("pre", { cls: "mg-builder-preview-code" });

		const footer = contentEl.createDiv({ cls: "mg-builder-footer" });
		footer
			.createEl("button", { cls: "mg-builder-cancel-btn", text: "Cancel" })
			.addEventListener("click", () => this.close());
		footer
			.createEl("button", { cls: "mg-builder-insert-btn mod-cta", text: "Insert gallery block" })
			.addEventListener("click", () => this.insertBlock());

		this.refreshPreview();
	}

	private addLocalSource(): void {
		this.sources.push({ kind: "local", path: "", recursive: false, caption: "" });
		this.renderSources();
		this.refreshPreview();
	}

	private addUrlSource(): void {
		this.sources.push({ kind: "url", url: "", caption: "" });
		this.renderSources();
		this.refreshPreview();
	}

	private moveSource(index: number, delta: number): void {
		const next = index + delta;
		if (next < 0 || next >= this.sources.length) return;
		const item = this.sources[index];
		if (!item) return;
		this.sources.splice(index, 1);
		this.sources.splice(next, 0, item);
		this.renderSources();
		this.refreshPreview();
	}

	private removeSource(index: number): void {
		this.sources.splice(index, 1);
		this.renderSources();
		this.refreshPreview();
	}

	private renderSources(): void {
		const container = this.sourcesContainer;
		if (!container) return;
		container.empty();

		if (this.sources.length === 0) {
			const empty = container.createDiv({ cls: "mg-builder-empty-state" });
			empty.createEl("h4", { text: "No sources yet" });
			empty.createEl("p", {
				text: "Add a local vault path (file or folder) or an external image URL.",
			});
			return;
		}

		this.sources.forEach((source, index) => {
			const card = container.createDiv({ cls: "mg-builder-source-card" });
			card.setAttr("draggable", "true");

			card.addEventListener("dragstart", (event) => {
				event.dataTransfer?.setData("text/plain", String(index));
				card.addClass("is-dragging");
			});
			card.addEventListener("dragend", () => card.removeClass("is-dragging"));
			card.addEventListener("dragover", (event) => {
				event.preventDefault();
				card.addClass("is-drag-over");
			});
			card.addEventListener("dragleave", () => card.removeClass("is-drag-over"));
			card.addEventListener("drop", (event) => {
				event.preventDefault();
				card.removeClass("is-drag-over");
				const from = Number(event.dataTransfer?.getData("text/plain"));
				if (Number.isNaN(from) || from === index) return;
				const item = this.sources[from];
				if (!item) return;
				this.sources.splice(from, 1);
				this.sources.splice(index, 0, item);
				this.renderSources();
				this.refreshPreview();
			});

			const headerRow = card.createDiv({ cls: "mg-builder-source-card-header" });
			headerRow.createSpan({
				cls: "mg-builder-source-title",
				text: source.kind === "local" ? `Local #${index + 1}` : `URL #${index + 1}`,
			});

			const actions = headerRow.createDiv({ cls: "mg-builder-source-actions" });
			if (index > 0) {
				actions
					.createEl("button", { cls: "mg-builder-icon-btn", text: "↑", attr: { title: "Move up" } })
					.addEventListener("click", () => this.moveSource(index, -1));
			}
			if (index < this.sources.length - 1) {
				actions
					.createEl("button", { cls: "mg-builder-icon-btn", text: "↓", attr: { title: "Move down" } })
					.addEventListener("click", () => this.moveSource(index, 1));
			}
			actions
				.createEl("button", { cls: "mg-builder-icon-btn", text: "✕", attr: { title: "Remove" } })
				.addEventListener("click", () => this.removeSource(index));

			const body = card.createDiv({ cls: "mg-builder-source-card-body" });

			if (source.kind === "local") {
				new Setting(body)
					.setName("Vault path")
					.setDesc("File or folder path from vault root, e.g. Images/hero.png or Characters/Art/")
					.addText((text) =>
						text.setValue(source.path).onChange((value) => {
							source.path = value.trim();
							this.refreshPreview();
						}),
					);
				new Setting(body)
					.setName("Recursive folder scan")
					.addToggle((toggle) =>
						toggle.setValue(source.recursive).onChange((value) => {
							source.recursive = value;
							this.refreshPreview();
						}),
					);
				new Setting(body)
					.setName("Caption")
					.addText((text) =>
						text.setPlaceholder("Optional caption for all items from this source").onChange((value) => {
							source.caption = value;
							this.refreshPreview();
						}),
					);
			} else {
				new Setting(body)
					.setName("Image URL")
					.setDesc("Must start with http:// or https://")
					.addText((text) =>
						text.setValue(source.url).onChange((value) => {
							source.url = value.trim();
							this.refreshPreview();
						}),
					);
				new Setting(body)
					.setName("Caption")
					.addText((text) =>
						text.setPlaceholder("Optional caption").onChange((value) => {
							source.caption = value;
							this.refreshPreview();
						}),
					);
			}
		});
	}

	private buildBlockBody(): string {
		const locals = this.sources
			.filter((s): s is LocalSource => s.kind === "local" && s.path.length > 0)
			.map((s) => ({
				path: s.path,
				recursive: s.recursive,
				caption: s.caption.trim() || undefined,
			}));
		const urls = this.sources
			.filter((s): s is UrlSource => s.kind === "url" && s.url.length > 0)
			.map((s) => ({
				url: s.url,
				caption: s.caption.trim() || undefined,
			}));

		if (locals.length === 0 && urls.length === 0) {
			return "# Add at least one source with a path or URL.";
		}

		return formatMediaGalleryBlock({
			view: this.view,
			filter: this.filter,
			locals,
			urls,
		});
	}

	private buildBlockText(): string {
		return `\`\`\`media-gallery\n${this.buildBlockBody()}\n\`\`\``;
	}

	private refreshPreview(): void {
		if (!this.previewEl) return;
		this.previewEl.setText(this.buildBlockBody());
	}

	private insertBlock(): void {
		const locals = this.sources.filter((s) => s.kind === "local" && s.path.trim());
		const urls = this.sources.filter((s) => s.kind === "url" && s.url.trim());
		if (locals.length === 0 && urls.length === 0) {
			new Notice("Add at least one source with a path or URL.");
			return;
		}

		const block = this.buildBlockText();
		const cursor = this.editor.getCursor();
		this.editor.replaceRange(`${block}\n`, cursor);
		this.close();
		new Notice("Media gallery block inserted.");
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
