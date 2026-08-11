import { App, Component, MarkdownRenderer, PluginSettingTab, Setting } from "obsidian";
import type MediaGalleryPlugin from "./main";
import { renderReadmePanel, renderSettingsTabBar, type PluginSettingsTabId } from "./readmeTab";
import { DEFAULT_SETTINGS, MEDIA_FILTERS, VIEW_TYPES } from "./types";

export class MediaGallerySettingTab extends PluginSettingTab {
	plugin: MediaGalleryPlugin;
	private activeTab: PluginSettingsTabId = "settings";
	private readmeComponent = new Component();

	constructor(app: App, plugin: MediaGalleryPlugin) {
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

		containerEl.createEl("h2", { text: "Media Gallery" });

		const tabBar = containerEl.createDiv();
		renderSettingsTabBar(tabBar, this.activeTab, (tab) => {
			this.activeTab = tab;
			this.display();
		}, "mg");

		const content = containerEl.createDiv({ cls: "mg-settings-content" });

		if (this.activeTab === "readme") {
			const pluginDir =
				this.plugin.manifest.dir ??
				`${this.app.vault.configDir}/plugins/${this.plugin.manifest.id}`;
			renderReadmePanel(this.app, content, this.readmeComponent, "mg-readme-panel", pluginDir);
			return;
		}

		this.displaySettings(content);
	}

	private displaySettings(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName("Allow remote images")
			.setDesc("Enable URL: entries that load images from http(s) addresses.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.allowRemoteImages).onChange(async (value) => {
					this.plugin.settings.allowRemoteImages = value;
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
			.setName("Default view")
			.addDropdown((dropdown) => {
				for (const view of VIEW_TYPES) dropdown.addOption(view, view);
				dropdown.setValue(this.plugin.settings.defaultView).onChange(async (value) => {
					this.plugin.settings.defaultView = value as typeof DEFAULT_SETTINGS.defaultView;
					await this.plugin.saveSettings();
				});
			});
	}
}
