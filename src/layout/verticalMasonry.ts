import {
	type ColumnSpec,
	MASONRY_AUTO_MIN_PX,
	resolveColumnLayout,
} from "./columnOptions";

export interface VerticalPlacement {
	itemIndex: number;
	columnIndex: number;
	width: number;
	height: number;
}

export interface VerticalMasonryLayout {
	placements: VerticalPlacement[];
	columnCount: number;
	columnWidth: number;
	containerHeight: number;
}

const MIN_ASPECT = 100 / 3;

function normalizeAspectRatio(srcW: number, srcH: number): { w: number; h: number } {
	if (srcW <= 0 || srcH <= 0) return { w: 4, h: 3 };
	if (srcW > srcH) {
		const h = Math.max((100 * srcH) / srcW, MIN_ASPECT);
		return { w: 100, h };
	}
	if (srcH > srcW) {
		const w = Math.max((100 * srcW) / srcH, MIN_ASPECT);
		return { w, h: 100 };
	}
	return { w: 1, h: 1 };
}

function heightAtWidth(ar: { w: number; h: number }, width: number): number {
	return Math.max(1, Math.round((width * ar.h) / ar.w));
}

/**
 * Allusion-style vertical masonry: shortest-column packing.
 * Based on allusion-app/Allusion wasm/masonry compute_vertical.
 */
export function computeVerticalMasonry(
	aspectRatios: Array<{ w: number; h: number }>,
	containerWidth: number,
	columnSpec: ColumnSpec,
	padding: number,
): VerticalMasonryLayout {
	if (aspectRatios.length === 0) {
		return { placements: [], columnCount: 0, columnWidth: 0, containerHeight: 0 };
	}

	const { columnCount, columnWidth } = resolveColumnLayout(
		columnSpec,
		containerWidth,
		MASONRY_AUTO_MIN_PX,
	);
	const itemWidth = Math.max(1, columnWidth);
	const colHeights = new Array<number>(columnCount).fill(0);
	const placements: VerticalPlacement[] = [];

	for (let itemIndex = 0; itemIndex < aspectRatios.length; itemIndex++) {
		const ratio = aspectRatios[itemIndex] ?? { w: 4, h: 3 };
		const ar = normalizeAspectRatio(ratio.w, ratio.h);
		const height = heightAtWidth(ar, itemWidth);

		let columnIndex = 0;
		for (let c = 1; c < columnCount; c++) {
			if ((colHeights[c] ?? 0) < (colHeights[columnIndex] ?? 0)) columnIndex = c;
		}

		placements.push({ itemIndex, columnIndex, width: itemWidth, height });
		colHeights[columnIndex] = (colHeights[columnIndex] ?? 0) + height + padding;
	}

	const containerHeight = colHeights.length > 0 ? Math.max(...colHeights) - padding : 0;
	return { placements, columnCount, columnWidth, containerHeight: Math.max(0, containerHeight) };
}
