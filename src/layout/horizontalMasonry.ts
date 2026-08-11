export interface MasonryBox {
	left: number;
	top: number;
	width: number;
	height: number;
}

export interface HorizontalMasonryLayout {
	boxes: MasonryBox[];
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

function widthAtHeight(ar: { w: number; h: number }, height: number): number {
	return Math.round((height * ar.w) / ar.h);
}

export function groupMasonryRows(boxes: MasonryBox[]): MasonryBox[][] {
	if (boxes.length === 0) return [];

	const rows: MasonryBox[][] = [];
	let currentTop = boxes[0]?.top ?? 0;
	let currentRow: MasonryBox[] = [];

	for (const box of boxes) {
		if (currentRow.length > 0 && box.top !== currentTop) {
			rows.push(currentRow);
			currentRow = [];
			currentTop = box.top;
		}
		currentRow.push(box);
	}

	if (currentRow.length > 0) rows.push(currentRow);
	for (const row of rows) row.sort((a, b) => a.left - b.left);
	return rows;
}

export function computeHorizontalMasonry(
	aspectRatios: Array<{ w: number; h: number }>,
	containerWidth: number,
	targetRowHeight: number,
	padding: number,
): HorizontalMasonryLayout {
	if (aspectRatios.length === 0) return { boxes: [], containerHeight: 0 };

	const cw = Math.max(containerWidth, targetRowHeight);
	const rowHeight = targetRowHeight;
	const maxWidth = cw;
	const boxes: MasonryBox[] = aspectRatios.map(() => ({ left: 0, top: 0, width: 0, height: 0 }));

	let top = 0;
	let rowWidth = 0;
	let start = 0;

	for (let end = 0; end < aspectRatios.length; end++) {
		const ratio = aspectRatios[end] ?? { w: 4, h: 3 };
		const ar = normalizeAspectRatio(ratio.w, ratio.h);
		const width = widthAtHeight(ar, rowHeight);

		boxes[end] = { width, height: rowHeight, top, left: rowWidth };
		rowWidth += width + padding;

		if (rowWidth > maxWidth) {
			const factor = cw / rowWidth;
			for (let i = start; i <= end; i++) {
				const box = boxes[i];
				if (!box) continue;
				box.width = Math.round(box.width * factor);
				box.height = Math.round(box.height * factor);
				box.left = Math.round(box.left * factor);
			}
			rowWidth = 0;
			start = end + 1;
			top += (boxes[end]?.height ?? rowHeight) + padding;
		}
	}

	const containerHeight = rowWidth === 0 ? top : top + rowHeight + padding;
	return { boxes, containerHeight };
}
