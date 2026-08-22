import { App, Platform, type Plugin, TFile } from "obsidian";
import type { GalleryItem } from "./types";

export const MEDIA_EXTENDED_PLUGIN_ID = "media-extended";

type AppWithPlugins = App & {
	plugins: { enabledPlugins: Set<string>; plugins: Record<string, Plugin> };
};

export function isMediaExtendedAvailable(app: App): boolean {
	const plugins = (app as AppWithPlugins).plugins;
	return (
		plugins.enabledPlugins.has(MEDIA_EXTENDED_PLUGIN_ID) &&
		Boolean(plugins.plugins[MEDIA_EXTENDED_PLUGIN_ID])
	);
}

const MX_OPEN_ACTION = "mx-open";

type ObsidianProtocolHandler = (params: Record<string, string>) => void | Promise<void>;

type WorkspaceWithProtocolHandlers = {
	protocolHandlers?: Map<string, ObsidianProtocolHandler>;
	protocolHandler?: { handlers?: Map<string, ObsidianProtocolHandler> };
};

export function buildMxOpenUri(app: App, url: string): string {
	const params = new URLSearchParams();
	params.set("url", url);
	params.set("vault", app.vault.getName());
	return `obsidian://mx-open?${params.toString()}`;
}

function getObsidianProtocolHandler(app: App, action: string): ObsidianProtocolHandler | undefined {
	const workspace = app.workspace as unknown as WorkspaceWithProtocolHandlers;
	const handlers = workspace.protocolHandler?.handlers ?? workspace.protocolHandlers;
	if (!(handlers instanceof Map)) return undefined;
	return handlers.get(action);
}

/** Invoke Media Extended's mx-open handler in-process (anchor clicks do not dispatch obsidian:// URIs). */
async function invokeMxOpenHandler(app: App, url: string): Promise<boolean> {
	const handler = getObsidianProtocolHandler(app, MX_OPEN_ACTION);
	if (!handler) return false;

	try {
		await handler({
			action: MX_OPEN_ACTION,
			url,
			vault: app.vault.getName(),
		});
		return true;
	} catch {
		return false;
	}
}

/**
 * Open a gallery video in Media Extended when that plugin is active.
 * Local files use Obsidian's file opener; remote URLs use the mx-open protocol.
 */
export async function tryOpenVideoInMediaExtended(
	app: App,
	item: GalleryItem,
): Promise<boolean> {
	if (!Platform.isDesktopApp) return false;
	if (!isMediaExtendedAvailable(app)) return false;
	if (item.mediaKind !== "video") return false;

	if ((item.source === "url" || item.source === "xiewer") && item.url) {
		return invokeMxOpenHandler(app, item.url);
	}

	if (item.source !== "local" || !item.path) return false;

	const file = app.vault.getAbstractFileByPath(item.path);
	if (!(file instanceof TFile)) return false;

	try {
		const leaf = app.workspace.getLeaf("tab");
		await leaf.openFile(file, { active: true });
		return true;
	} catch {
		return false;
	}
}
