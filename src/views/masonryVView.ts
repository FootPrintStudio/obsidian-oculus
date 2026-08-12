import type { Component } from "obsidian";
import { computeVerticalMasonry } from "../layout/verticalMasonry";
import { DEFAULT_COLUMN_OPTION, parseColumnOption } from "../layout/columnOptions";
import type { GalleryItem, MediaGallerySettings } from "../types";
import { attachAspectRatioListener, PLACEHOLDER_ASPECT } from "./mediaAspect";
import { observeGalleryLayout } from "./masonryLayout";
import { createMediaTile } from "./renderGallery";

const MASONRY_V_GAP_PX = 8;

export function renderMasonryV(
	container: HTMLElement,
	items: GalleryItem[],
	settings: MediaGallerySettings,
	columnWidthOption: string,
	onOpen: (index: number) => void,
	component: Component,
): void {
	const wrap = container.createDiv({ cls: "mg-view mg-view-masonry-v" });
	const stage = wrap.createDiv({ cls: "mg-masonry-v-stage" });
	const columnSpec = parseColumnOption(columnWidthOption || DEFAULT_COLUMN_OPTION);
	const aspectRatios: Array<{ w: number; h: number } | null> = items.map(() => null);
	const tileEls: Array<HTMLElement | undefined> = new Array(items.length);
	let scheduleRebuild = (): void => {};

	const rebuild = (width: number): void => {
		const ratios = aspectRatios.map((ratio) => ratio ?? PLACEHOLDER_ASPECT);
		const layout = computeVerticalMasonry(ratios, width, columnSpec, MASONRY_V_GAP_PX);

		const columnEls: HTMLElement[] = [];
		for (let c = 0; c < layout.columnCount; c++) {
			const col = stage.ownerDocument.createElement("div");
			col.className = "mg-masonry-v-col";
			col.style.width = `${layout.columnWidth}px`;
			col.style.flexShrink = "0";
			columnEls.push(col);
		}

		for (const placement of layout.placements) {
			const item = items[placement.itemIndex];
			const col = columnEls[placement.columnIndex];
			if (!item || !col) continue;

			const idx = placement.itemIndex;
			let tile = tileEls[idx];
			if (!tile) {
				tile = createMediaTile(col, item, settings, onOpen, idx, component);
				tile.addClass("mg-masonry-v-tile");
				tileEls[idx] = tile;

				const media = tile.querySelector<HTMLImageElement | HTMLVideoElement>("img, video");
				if (media) {
					attachAspectRatioListener(media, (ratio) => {
						aspectRatios[idx] = ratio;
						scheduleRebuild();
					});
				}
			} else {
				col.appendChild(tile);
			}
			tile.style.height = `${placement.height}px`;
		}

		stage.replaceChildren(...columnEls);
	};

	scheduleRebuild = observeGalleryLayout(wrap, component, rebuild, [container, stage]);
}
