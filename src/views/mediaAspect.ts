const PLACEHOLDER_ASPECT = { w: 4, h: 3 };

export { PLACEHOLDER_ASPECT };

export function readMediaAspectRatio(
	media: HTMLImageElement | HTMLVideoElement,
): { w: number; h: number } | null {
	if (media.tagName === "IMG") {
		const image = media as HTMLImageElement;
		if (image.naturalWidth > 0 && image.naturalHeight > 0) {
			return { w: image.naturalWidth, h: image.naturalHeight };
		}
		return null;
	}
	const video = media as HTMLVideoElement;
	if (video.videoWidth > 0 && video.videoHeight > 0) {
		return { w: video.videoWidth, h: video.videoHeight };
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

	if (media.tagName === "IMG") {
		if (readMediaAspectRatio(media)) emit();
		else media.addEventListener("load", emit, { once: true });
		return;
	}

	const video = media as HTMLVideoElement;
	if (video.readyState >= 1) emit();
	else video.addEventListener("loadedmetadata", emit, { once: true });
}
