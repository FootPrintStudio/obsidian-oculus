import { MarkdownPostProcessorContext, MarkdownRenderChild } from "obsidian";
import type OculusPlugin from "./main";
import { parseMediaGalleryBlock } from "./parseBlock";
import { resolveGalleryItems } from "./resolveSources";
import { resetDeferredMediaLoader } from "./views/deferredMedia";
import { renderErrorPanel, renderGalleryView, renderWarningPanel } from "./views/renderGallery";

export class GalleryBlock extends MarkdownRenderChild {
	private plugin: OculusPlugin;
	private source: string;

	constructor(container: HTMLElement, plugin: OculusPlugin, source: string) {
		super(container);
		this.plugin = plugin;
		this.source = source;
	}

	onload(): void {
		void this.render();
	}

	async render(): Promise<void> {
		const el = this.containerEl;
		resetDeferredMediaLoader(this);
		el.empty();
		el.addClass("mg-block");

		const parsed = parseMediaGalleryBlock(
			this.source,
			this.plugin.settings.defaultView,
			this.plugin.settings.defaultFilter,
		);
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
			renderErrorPanel(el, ["No media items resolved for this gallery."], { append: true });
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
			parsed,
		);
	}
}

export function createGalleryBlock(
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext,
	plugin: OculusPlugin,
	source: string,
): GalleryBlock {
	el.empty();
	const block = new GalleryBlock(el, plugin, source);
	ctx.addChild(block);
	plugin.registerGalleryBlock(block);
	return block;
}
