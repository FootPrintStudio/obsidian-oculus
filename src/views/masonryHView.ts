import type { Component } from "obsidian";
import { resolveMasonryRowHeightPx } from "../parseBlock";
import { computeHorizontalMasonry, groupMasonryRows } from "../layout/horizontalMasonry";
import type { GalleryItem, MediaGallerySettings } from "../types";
import { attachAspectRatioListener, PLACEHOLDER_ASPECT } from "./mediaAspect";
import { observeGalleryLayout } from "./masonryLayout";
import { createMediaTile } from "./renderGallery";

const MASONRY_H_GAP_PX = 8;

export function renderMasonryH(
	container: HTMLElement,
	items: GalleryItem[],
	settings: MediaGallerySettings,
	rowHeightPx: number | null,
	onOpen: (index: number) => void,
	component: Component,
): void {
	const wrap = container.createDiv({ cls: "mg-view mg-view-masonry-h" });
	const stage = wrap.createDiv({ cls: "mg-masonry-h-stage" });
	const targetRowHeight = resolveMasonryRowHeightPx(rowHeightPx);
	const aspectRatios: Array<{ w: number; h: number } | null> = items.map(() => null);
	const tileEls: Array<HTMLElement | undefined> = new Array(items.length);
	let scheduleRebuild = (): void => {};

	const rebuild = (width: number): void => {
		const ratios = aspectRatios.map((ratio) => ratio ?? PLACEHOLDER_ASPECT);
		const layout = computeHorizontalMasonry(ratios, width, targetRowHeight, MASONRY_H_GAP_PX);
		const rows = groupMasonryRows(layout.boxes);
		const rowEls: HTMLElement[] = [];

		let itemIndex = 0;
		for (const rowBoxes of rows) {
			const rowHeight = rowBoxes[0]?.height ?? targetRowHeight;
			const rowEl = stage.ownerDocument.createElement("div");
			rowEl.className = "mg-masonry-h-row";
			rowEl.style.height = `${rowHeight}px`;
			rowEls.push(rowEl);

			for (const box of rowBoxes) {
				const item = items[itemIndex];
				if (!item) break;

				const idx = itemIndex;
				let tile = tileEls[idx];
				if (!tile) {
					tile = createMediaTile(rowEl, item, settings, onOpen, idx, component);
					tile.addClass("mg-masonry-h-tile");
					tileEls[idx] = tile;

					const media = tile.querySelector<HTMLImageElement | HTMLVideoElement>("img, video");
					if (media) {
						attachAspectRatioListener(media, (ratio) => {
							aspectRatios[idx] = ratio;
							scheduleRebuild();
						});
					}
				} else {
					rowEl.appendChild(tile);
				}
				tile.style.width = `${box.width}px`;
				tile.style.flexShrink = "0";

				itemIndex++;
			}
		}

		stage.replaceChildren(...rowEls);
	};

	scheduleRebuild = observeGalleryLayout(wrap, component, rebuild, [container, stage]);
}
