import { App, Component, Platform, PluginSettingTab, Setting } from "obsidian";
import type OculusPlugin from "./main";
import { isMediaExtendedAvailable } from "./mediaExtended";
import {
	renderGuidePanel,
	renderReadmePanel,
	renderSettingsTabBar,
	type PluginSettingsTabId,
} from "./readmeTab";
import { DEFAULT_SETTINGS, VIEW_TYPES } from "./types";

export class MediaGallerySettingTab extends PluginSettingTab {
	plugin: OculusPlugin;
	private activeTab: PluginSettingsTabId = "settings";
	private readmeComponent = new Component();

	constructor(app: App, plugin: OculusPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	hide(): void {
		this.readmeComponent.unload();
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		this.readmeComponent.unload();
		this.readmeComponent = new Component();

		containerEl.createEl("h2", { text: "Oculus" });

		const tabBar = containerEl.createDiv();
		renderSettingsTabBar(tabBar, this.activeTab, (tab) => {
			this.activeTab = tab;
			this.display();
		}, "mg");

		const content = containerEl.createDiv({ cls: "mg-settings-content" });
		const pluginDir =
			this.plugin.manifest.dir ??
			`${this.app.vault.configDir}/plugins/${this.plugin.manifest.id}`;

		if (this.activeTab === "readme") {
			renderReadmePanel(this.app, content, this.readmeComponent, "mg-readme-panel", pluginDir);
			return;
		}

		if (this.activeTab === "guide") {
			renderGuidePanel(this.app, content, this.readmeComponent, "mg-guide-panel", pluginDir);
			return;
		}

		this.displaySettings(content);
	}

	private displaySettings(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName("Allow remote media")
			.setDesc("Enable URL: entries for remote images, direct video links, and hosted platforms.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.allowRemoteImages).onChange(async (value) => {
					this.plugin.settings.allowRemoteImages = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName("Validate remote Content-Type")
			.setDesc(
				"When enabled, URL entries without a recognized extension are checked via HEAD/GET before loading.",
			)
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.validateRemoteContentType).onChange(async (value) => {
					this.plugin.settings.validateRemoteContentType = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName("Remote request timeout")
			.setDesc("Milliseconds to wait when probing remote Content-Type.")
			.addText((text) =>
				text
					.setPlaceholder("30000")
					.setValue(String(this.plugin.settings.remoteLoadTimeoutMs))
					.onChange(async (value) => {
						const parsed = Number.parseInt(value.trim(), 10);
						if (Number.isNaN(parsed) || parsed < 1000) return;
						this.plugin.settings.remoteLoadTimeoutMs = parsed;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Show captions")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.showCaptions).onChange(async (value) => {
					this.plugin.settings.showCaptions = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName("Caption max lines")
			.addSlider((slider) =>
				slider
					.setLimits(1, 5, 1)
					.setValue(this.plugin.settings.captionMaxLines)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.captionMaxLines = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Use Media Extended for videos")
			.setDesc(
				Platform.isDesktopApp && isMediaExtendedAvailable(this.app)
					? "Open local and direct URL videos in Media Extended when a gallery tile is clicked. Hosted platform URLs (YouTube, Vimeo, etc.) always use Media Extended. Images still use the built-in lightbox."
					: "Requires the Media Extended plugin (desktop). Local and direct URL videos use the lightbox when unavailable. Hosted platform URLs will not resolve without Media Extended.",
			)
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.useMediaExtendedPlayback).onChange(async (value) => {
					this.plugin.settings.useMediaExtendedPlayback = value;
					await this.plugin.saveSettings();
				}),
			);

		if (!Platform.isDesktopApp || !isMediaExtendedAvailable(this.app)) {
			new Setting(containerEl).setName("Hosted platform URLs").setDesc(
				"YouTube, Vimeo, Bilibili, and Coursera links require Media Extended on desktop. They will show a resolve warning until Media Extended is installed and enabled.",
			);
		}

		new Setting(containerEl)
			.setName("Lightbox note images")
			.setDesc(
				"Click wiki embeds and markdown images in notes to open the Oculus lightbox. Ctrl/Cmd, Alt, and Shift+click keep Obsidian’s default behavior. Gallery tiles always use the lightbox.",
			)
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.lightboxMarkdownImages).onChange(async (value) => {
					this.plugin.settings.lightboxMarkdownImages = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName("Default view")
			.setDesc("Used when VIEW is omitted from a block.")
			.addDropdown((dropdown) => {
				for (const view of VIEW_TYPES) dropdown.addOption(view, view);
				dropdown.setValue(this.plugin.settings.defaultView).onChange(async (value) => {
					this.plugin.settings.defaultView = value as typeof DEFAULT_SETTINGS.defaultView;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Default filter")
			.setDesc("Used when FILTER is omitted from a block.")
			.addDropdown((dropdown) => {
				dropdown.addOption("all", "All media");
				dropdown.addOption("images", "Images only");
				dropdown.addOption("video", "Video only");
				dropdown.setValue(this.plugin.settings.defaultFilter).onChange(async (value) => {
					this.plugin.settings.defaultFilter = value as typeof DEFAULT_SETTINGS.defaultFilter;
					await this.plugin.saveSettings();
				});
			});
	}
}
