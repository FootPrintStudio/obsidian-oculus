import type { Component } from "obsidian";

const DEFERRED_MEDIA_ROOT_MARGIN = "600px";

interface DeferredMediaLoader {
	observer: IntersectionObserver;
}

const deferredMediaLoaders = new WeakMap<Component, DeferredMediaLoader>();

function isImageElement(target: EventTarget): target is HTMLImageElement {
	return (target as Element).tagName === "IMG";
}

function isMediaElement(
	target: EventTarget,
): target is HTMLImageElement | HTMLVideoElement {
	const tagName = (target as Element).tagName;
	return tagName === "IMG" || tagName === "VIDEO";
}

function activateDeferredMedia(media: HTMLImageElement | HTMLVideoElement): void {
	const src = media.dataset.src;
	if (!src) return;
	delete media.dataset.src;

	const markLoaded = (): void => media.classList.add("mg-lazy-loaded");
	if (isImageElement(media)) {
		media.addEventListener("load", markLoaded, { once: true });
		media.src = src;
		if (media.complete && media.naturalWidth > 0) markLoaded();
		return;
	}

	media.addEventListener("loadedmetadata", markLoaded, { once: true });
	media.src = src;
	media.preload = "metadata";
	media.load();
}

export function resetDeferredMediaLoader(component: Component): void {
	deferredMediaLoaders.get(component)?.observer.disconnect();
}

export function observeDeferredMedia(
	component: Component,
	media: HTMLImageElement | HTMLVideoElement,
): void {
	media.classList.add("mg-lazy");

	if (typeof IntersectionObserver === "undefined") {
		activateDeferredMedia(media);
		return;
	}

	let loader = deferredMediaLoaders.get(component);
	if (!loader) {
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) continue;
					const target = entry.target;
					if (!isMediaElement(target)) continue;
					observer.unobserve(target);
					activateDeferredMedia(target);
				}
			},
			{ rootMargin: DEFERRED_MEDIA_ROOT_MARGIN },
		);
		loader = { observer };
		deferredMediaLoaders.set(component, loader);
		component.register(() => {
			observer.disconnect();
			deferredMediaLoaders.delete(component);
		});
	}

	loader.observer.observe(media);
}

export function unobserveDeferredMedia(
	component: Component,
	media: HTMLImageElement | HTMLVideoElement,
): void {
	deferredMediaLoaders.get(component)?.observer.unobserve(media);
}
