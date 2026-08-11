import { App, Component, MarkdownRenderer } from "obsidian";

export type PluginSettingsTabId = "settings" | "readme";

const README_FALLBACK =
	"# README not found\n\nCould not load README.md from the plugin folder.";

export async function loadPluginReadme(
	pluginDir: string,
	adapter: App["vault"]["adapter"],
): Promise<string> {
	const readmePath = `${pluginDir}/README.md`;
	try {
		if (await adapter.exists(readmePath)) {
			return await adapter.read(readmePath);
		}
	} catch {
		// fall through
	}
	return README_FALLBACK;
}

export function renderSettingsTabBar(
	container: HTMLElement,
	activeTab: PluginSettingsTabId,
	onSelect: (tab: PluginSettingsTabId) => void,
	classPrefix: string,
): void {
	container.empty();
	container.addClass(`${classPrefix}-settings-tabs`);

	for (const tab of [
		{ id: "settings" as const, label: "Settings" },
		{ id: "readme" as const, label: "README" },
	]) {
		const btn = container.createDiv({
			cls: `${classPrefix}-settings-tab${activeTab === tab.id ? " is-active" : ""}`,
			text: tab.label,
		});
		btn.addEventListener("click", () => {
			if (activeTab !== tab.id) onSelect(tab.id);
		});
	}
}

export function renderReadmePanel(
	app: App,
	container: HTMLElement,
	component: Component,
	panelClass: string,
	pluginDir: string,
): void {
	container.empty();
	container.addClass(panelClass);
	void loadPluginReadme(pluginDir, app.vault.adapter).then((markdown) =>
		MarkdownRenderer.render(app, markdown, container, "", component),
	);
}
