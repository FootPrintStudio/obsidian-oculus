const PLACEHOLDER_ASPECT = { w: 4, h: 3 };

export { PLACEHOLDER_ASPECT };

export function readMediaAspectRatio(
	media: HTMLImageElement | HTMLVideoElement,
): { w: number; h: number } | null {
	if (media instanceof HTMLImageElement) {
		if (media.naturalWidth > 0 && media.naturalHeight > 0) {
			return { w: media.naturalWidth, h: media.naturalHeight };
		}
		return null;
	}
	if (media.videoWidth > 0 && media.videoHeight > 0) {
		return { w: media.videoWidth, h: media.videoHeight };
	}
	return null;
}

export function attachAspectRatioListener(
	media: HTMLImageElement | HTMLVideoElement,
	onRatio: (ratio: { w: number; h: number }) => void,
): void {
	const emit = (): void => {
		const ratio = readMediaAspectRatio(media);
		if (ratio) onRatio(ratio);
	};

	if (media instanceof HTMLImageElement) {
		if (media.complete) emit();
		else media.addEventListener("load", emit, { once: true });
		return;
	}

	if (media.readyState >= 1) emit();
	else media.addEventListener("loadedmetadata", emit, { once: true });
}
