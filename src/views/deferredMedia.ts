import type { Component } from "obsidian";
import { resolveXiewerObjectUrl } from "../xiewerClient";

const DEFERRED_MEDIA_ROOT_MARGIN = "600px";

interface DeferredMediaLoader {
	observers: Map<Document, IntersectionObserver>;
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

function applySrc(media: HTMLImageElement | HTMLVideoElement, src: string): void {
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

function activateDeferredMedia(media: HTMLImageElement | HTMLVideoElement): void {
	const src = media.dataset.src;
	if (!src) return;
	delete media.dataset.src;

	const token = media.dataset.authToken;
	const header = media.dataset.authHeader;
	if (!token) {
		applySrc(media, src);
		return;
	}

	void resolveXiewerObjectUrl(src, token, header)
		.then((objectUrl) => applySrc(media, objectUrl))
		.catch(() => {
			media.dispatchEvent(new Event("error"));
		});
}

export function resetDeferredMediaLoader(component: Component): void {
	const loader = deferredMediaLoaders.get(component);
	if (!loader) return;
	for (const observer of loader.observers.values()) observer.disconnect();
	loader.observers.clear();
}

export function observeDeferredMedia(
	component: Component,
	media: HTMLImageElement | HTMLVideoElement,
): void {
	media.classList.add("mg-lazy");

	const document = media.ownerDocument;
	const Observer = document.defaultView?.IntersectionObserver;
	if (!Observer) {
		activateDeferredMedia(media);
		return;
	}

	let loader = deferredMediaLoaders.get(component);
	if (!loader) {
		const createdLoader: DeferredMediaLoader = { observers: new Map() };
		loader = createdLoader;
		deferredMediaLoaders.set(component, createdLoader);
		component.register(() => {
			for (const observer of createdLoader.observers.values()) observer.disconnect();
			createdLoader.observers.clear();
			deferredMediaLoaders.delete(component);
		});
	}

	let observer = loader.observers.get(document);
	if (!observer) {
		const createdObserver = new Observer(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) continue;
					const target = entry.target;
					if (!isMediaElement(target)) continue;
					createdObserver.unobserve(target);
					activateDeferredMedia(target);
				}
			},
			{ rootMargin: DEFERRED_MEDIA_ROOT_MARGIN },
		);
		observer = createdObserver;
		loader.observers.set(document, createdObserver);
	}

	observer.observe(media);
}

export function unobserveDeferredMedia(
	component: Component,
	media: HTMLImageElement | HTMLVideoElement,
): void {
	deferredMediaLoaders
		.get(component)
		?.observers.get(media.ownerDocument)
		?.unobserve(media);
}
