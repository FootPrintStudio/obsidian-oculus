import type { Component } from "obsidian";

const LAYOUT_DEBOUNCE_MS = 32;
const MAX_WIDTH_RETRIES = 30;

/** Observe size changes and run layout when the gallery has a measurable width. */
export function observeGalleryLayout(
	wrap: HTMLElement,
	component: Component,
	rebuild: (width: number) => void,
	fallbackTargets: HTMLElement[] = [],
): () => void {
	let layoutTimer: number | null = null;
	let pendingWidthRetry = 0;

	const scheduleRebuild = (): void => {
		if (layoutTimer !== null) window.clearTimeout(layoutTimer);
		layoutTimer = window.setTimeout(() => {
			layoutTimer = null;
			runRebuild();
		}, LAYOUT_DEBOUNCE_MS);
	};

	const readWidth = (): number => {
		if (wrap.clientWidth > 0) return wrap.clientWidth;
		for (const target of fallbackTargets) {
			if (target.clientWidth > 0) return target.clientWidth;
		}
		return 0;
	};

	const runRebuild = (): void => {
		const width = readWidth();
		if (width <= 0) {
			if (pendingWidthRetry < MAX_WIDTH_RETRIES) {
				pendingWidthRetry++;
				requestAnimationFrame(runRebuild);
			}
			return;
		}
		pendingWidthRetry = 0;
		rebuild(width);
	};

	const observer = new ResizeObserver(() => scheduleRebuild());
	observer.observe(wrap);
	component.register(() => {
		observer.disconnect();
		if (layoutTimer !== null) window.clearTimeout(layoutTimer);
	});

	runRebuild();
	return scheduleRebuild;
}
