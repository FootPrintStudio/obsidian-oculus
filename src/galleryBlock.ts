import { MarkdownPostProcessorContext, MarkdownRenderChild } from "obsidian";
import type MediaGalleryPlugin from "./main";
import { parseMediaGalleryBlock } from "./parseBlock";
import { resolveGalleryItems } from "./resolveSources";
import { renderErrorPanel, renderGalleryView, renderWarningPanel } from "./views/renderGallery";

export class GalleryBlock extends MarkdownRenderChild {
	private plugin: MediaGalleryPlugin;
	private source: string;

	constructor(container: HTMLElement, plugin: MediaGalleryPlugin, source: string) {
		super(container);
		this.plugin = plugin;
		this.source = source;
	}

	onload(): void {
		void this.render();
	}

	async render(): Promise<void> {
		const el = this.containerEl;
		el.empty();
		el.addClass("mg-block");

		const parsed = parseMediaGalleryBlock(this.source, this.plugin.settings.defaultView);
		const errorMessages = parsed.errors.map((e) => `Line ${e.line}: ${e.message}`);

		if (errorMessages.length > 0) {
			renderErrorPanel(el, errorMessages);
			return;
		}

		const { items, warnings } = await resolveGalleryItems(
			this.plugin.app,
			parsed,
			this.plugin.settings,
		);
		const warningMessages = warnings.map((w) => `Line ${w.line}: ${w.message}`);
		renderWarningPanel(el, warningMessages);

		if (items.length === 0) {
			renderErrorPanel(el, ["No media items resolved for this gallery."]);
			return;
		}

		const galleryEl = el.createDiv({ cls: "mg-gallery-host" });
		renderGalleryView(
			this.plugin.app,
			galleryEl,
			this,
			parsed.view,
			items,
			this.plugin.settings,
		);
	}
}

export function createGalleryBlock(
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext,
	plugin: MediaGalleryPlugin,
	source: string,
): GalleryBlock {
	el.empty();
	const block = new GalleryBlock(el, plugin, source);
	ctx.addChild(block);
	plugin.registerGalleryBlock(block);
	return block;
}
