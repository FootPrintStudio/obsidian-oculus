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
	let scheduleRebuild = (): void => {};

	const rebuild = (width: number): void => {
		const ratios = aspectRatios.map((ratio) => ratio ?? PLACEHOLDER_ASPECT);
		const layout = computeHorizontalMasonry(ratios, width, targetRowHeight, MASONRY_H_GAP_PX);
		const rows = groupMasonryRows(layout.boxes);

		stage.empty();

		let itemIndex = 0;
		for (const rowBoxes of rows) {
			const rowHeight = rowBoxes[0]?.height ?? targetRowHeight;
			const rowEl = stage.createDiv({ cls: "mg-masonry-h-row" });
			rowEl.style.height = `${rowHeight}px`;

			for (const box of rowBoxes) {
				const item = items[itemIndex];
				if (!item) break;

				const idx = itemIndex;
				const tile = createMediaTile(rowEl, item, settings, onOpen, idx);
				tile.addClass("mg-masonry-h-tile");
				tile.style.width = `${box.width}px`;
				tile.style.flexShrink = "0";

				const media = tile.querySelector("img, video");
				if (
					(media instanceof HTMLImageElement || media instanceof HTMLVideoElement) &&
					!aspectRatios[idx]
				) {
					attachAspectRatioListener(media, (ratio) => {
						aspectRatios[idx] = ratio;
						scheduleRebuild();
					});
				}

				itemIndex++;
			}
		}
	};

	scheduleRebuild = observeGalleryLayout(wrap, component, rebuild, [container, stage]);
}
