import { MarkdownView, Notice, Plugin, TFile } from "obsidian";
import { GalleryBuilderModal } from "./builderModal";
import { createGalleryBlock, GalleryBlock } from "./galleryBlock";
import { MediaGallerySettingTab } from "./settings";
import { DEFAULT_SETTINGS, IMAGE_EXTENSIONS, VIDEO_EXTENSIONS, type MediaGallerySettings } from "./types";

const MEDIA_EXTENSIONS = new Set([...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS]);

export default class MediaGalleryPlugin extends Plugin {
	settings: MediaGallerySettings = { ...DEFAULT_SETTINGS };
	private activeBlocks = new Set<GalleryBlock>();
	private refreshTimer: number | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new MediaGallerySettingTab(this.app, this));

		this.registerMarkdownCodeBlockProcessor("media-gallery", (source, el, ctx) => {
			createGalleryBlock(el, ctx, this, source);
		});

		this.registerEvent(
			this.app.vault.on("create", (file) => {
				if (file instanceof TFile && MEDIA_EXTENSIONS.has(file.extension.toLowerCase())) {
					this.scheduleRefresh();
				}
			}),
		);
		this.registerEvent(
			this.app.vault.on("delete", (file) => {
				if (file instanceof TFile && MEDIA_EXTENSIONS.has(file.extension.toLowerCase())) {
					this.scheduleRefresh();
				}
			}),
		);
		this.registerEvent(
			this.app.vault.on("rename", (file, _oldPath) => {
				if (file instanceof TFile && MEDIA_EXTENSIONS.has(file.extension.toLowerCase())) {
					this.scheduleRefresh();
				}
			}),
		);
		this.registerEvent(
			this.app.vault.on("modify", (file) => {
				if (file instanceof TFile && MEDIA_EXTENSIONS.has(file.extension.toLowerCase())) {
					this.scheduleRefresh();
				}
			}),
		);

		this.addCommand({
			id: "insert-media-gallery",
			name: "Insert media gallery",
			callback: () => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!view?.editor) {
					new Notice("Open a note to insert a media gallery block.");
					return;
				}
				new GalleryBuilderModal(this.app, this, view.editor).open();
			},
		});
	}

	onunload(): void {
		this.activeBlocks.clear();
		if (this.refreshTimer !== null) {
			window.clearTimeout(this.refreshTimer);
			this.refreshTimer = null;
		}
	}

	registerGalleryBlock(block: GalleryBlock): void {
		this.activeBlocks.add(block);
		block.register(() => this.activeBlocks.delete(block));
	}

	scheduleRefresh(): void {
		if (this.refreshTimer !== null) window.clearTimeout(this.refreshTimer);
		this.refreshTimer = window.setTimeout(() => {
			this.refreshTimer = null;
			void this.refreshAllBlocks();
		}, 750);
	}

	async refreshAllBlocks(): Promise<void> {
		for (const block of [...this.activeBlocks]) {
			await block.render();
		}
	}

	async loadSettings(): Promise<void> {
		const data = (await this.loadData()) as Partial<MediaGallerySettings> | null;
		this.settings = { ...DEFAULT_SETTINGS, ...data };
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		void this.refreshAllBlocks();
	}
}
