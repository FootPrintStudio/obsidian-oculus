import { Plugin, TFile } from "obsidian";
import { createGalleryBlock, GalleryBlock } from "./galleryBlock";
import { registerMarkdownImageLightbox } from "./noteLightbox";
import { MediaGallerySettingTab } from "./settings";
import { DEFAULT_SETTINGS, IMAGE_EXTENSIONS, VIDEO_EXTENSIONS, type MediaGallerySettings } from "./types";

const MEDIA_EXTENSIONS = new Set([...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS]);

export default class OculusPlugin extends Plugin {
	settings: MediaGallerySettings = { ...DEFAULT_SETTINGS };
	private activeBlocks = new Set<GalleryBlock>();
	private refreshTimer: number | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new MediaGallerySettingTab(this.app, this));

		this.registerMarkdownCodeBlockProcessor("oculus", (source, el, ctx) => {
			createGalleryBlock(el, ctx, this, source);
		});

		registerMarkdownImageLightbox(this, () => this.settings);

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
