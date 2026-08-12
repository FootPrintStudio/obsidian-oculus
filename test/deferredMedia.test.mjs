import assert from "node:assert/strict";
import test from "node:test";

class FakeClassList {
	#classes = new Set();

	add(name) {
		this.#classes.add(name);
	}

	contains(name) {
		return this.#classes.has(name);
	}
}

class FakeMedia {
	constructor(tagName) {
		this.tagName = tagName;
		this.classList = new FakeClassList();
		this.dataset = {};
		this.listeners = new Map();
		this.src = "";
	}

	addEventListener(type, listener) {
		this.listeners.set(type, listener);
	}

	dispatch(type) {
		this.listeners.get(type)?.();
	}
}

class FakeImage extends FakeMedia {
	constructor() {
		super("IMG");
		this.complete = false;
		this.naturalWidth = 0;
		this.naturalHeight = 0;
	}
}

class FakeVideo extends FakeMedia {
	constructor() {
		super("VIDEO");
		this.loadCalls = 0;
		this.preload = "none";
		this.readyState = 0;
		this.videoWidth = 0;
		this.videoHeight = 0;
	}

	load() {
		this.loadCalls++;
	}
}

class FakeIntersectionObserver {
	static instances = [];

	constructor(callback, options) {
		this.callback = callback;
		this.options = options;
		this.targets = new Set();
		this.disconnectCalls = 0;
		FakeIntersectionObserver.instances.push(this);
	}

	observe(target) {
		this.targets.add(target);
	}

	unobserve(target) {
		this.targets.delete(target);
	}

	disconnect() {
		this.disconnectCalls++;
		this.targets.clear();
	}

	trigger(target, isIntersecting) {
		this.callback([{ target, isIntersecting }]);
	}
}

globalThis.HTMLImageElement = FakeImage;
globalThis.HTMLVideoElement = FakeVideo;
globalThis.IntersectionObserver = FakeIntersectionObserver;

const { observeDeferredMedia, resetDeferredMediaLoader } = await import(
	"../.test-build/deferredMedia.mjs"
);
const { attachAspectRatioListener } = await import("../.test-build/mediaAspect.mjs");

function createComponent() {
	return {
		cleanup: null,
		register(callback) {
			this.cleanup = callback;
		},
	};
}

test("defers image sources and shares one observer per gallery", () => {
	const component = createComponent();
	const first = new FakeImage();
	const second = new FakeImage();
	first.dataset.src = "app://vault/first.jpg";
	second.dataset.src = "app://vault/second.jpg";

	observeDeferredMedia(component, first);
	observeDeferredMedia(component, second);

	const observer = FakeIntersectionObserver.instances.at(-1);
	assert.equal(observer.options.rootMargin, "600px");
	assert.equal(observer.targets.size, 2);
	assert.equal(first.src, "");
	assert.equal(first.classList.contains("mg-lazy"), true);

	observer.trigger(first, true);
	assert.equal(first.src, "app://vault/first.jpg");
	assert.equal(first.dataset.src, undefined);
	assert.equal(observer.targets.has(first), false);
	assert.equal(first.classList.contains("mg-lazy-loaded"), false);

	first.dispatch("load");
	assert.equal(first.classList.contains("mg-lazy-loaded"), true);
	assert.equal(second.src, "");
});

test("does not request video metadata until the tile approaches the viewport", () => {
	const component = createComponent();
	const video = new FakeVideo();
	video.dataset.src = "app://vault/clip.mp4";

	observeDeferredMedia(component, video);
	const observer = FakeIntersectionObserver.instances.at(-1);

	assert.equal(video.src, "");
	assert.equal(video.preload, "none");
	assert.equal(video.loadCalls, 0);

	observer.trigger(video, true);
	assert.equal(video.src, "app://vault/clip.mp4");
	assert.equal(video.preload, "metadata");
	assert.equal(video.loadCalls, 1);

	video.dispatch("loadedmetadata");
	assert.equal(video.classList.contains("mg-lazy-loaded"), true);
});

test("loads media created by a different window realm", () => {
	const component = createComponent();
	const foreignImage = new FakeMedia("IMG");
	foreignImage.complete = false;
	foreignImage.naturalWidth = 0;
	foreignImage.dataset.src = "app://vault/popout.jpg";

	assert.equal(foreignImage instanceof HTMLImageElement, false);
	observeDeferredMedia(component, foreignImage);
	const observer = FakeIntersectionObserver.instances.at(-1);
	observer.trigger(foreignImage, true);

	assert.equal(foreignImage.src, "app://vault/popout.jpg");
});

test("waits for deferred image dimensions even when an empty src reports complete", () => {
	const image = new FakeImage();
	image.complete = true;
	let ratio = null;

	attachAspectRatioListener(image, (nextRatio) => {
		ratio = nextRatio;
	});
	assert.equal(ratio, null);
	assert.equal(image.listeners.has("load"), true);

	image.naturalWidth = 1600;
	image.naturalHeight = 900;
	image.dispatch("load");
	assert.deepEqual(ratio, { w: 1600, h: 900 });
});

test("disconnects stale observations on rerender and unload", () => {
	const component = createComponent();
	const first = new FakeImage();
	const second = new FakeImage();
	first.dataset.src = "app://vault/first.jpg";
	second.dataset.src = "app://vault/second.jpg";

	observeDeferredMedia(component, first);
	const observer = FakeIntersectionObserver.instances.at(-1);
	resetDeferredMediaLoader(component);
	assert.equal(observer.disconnectCalls, 1);
	assert.equal(observer.targets.size, 0);

	observeDeferredMedia(component, second);
	assert.equal(FakeIntersectionObserver.instances.at(-1), observer);
	assert.equal(observer.targets.has(second), true);

	component.cleanup();
	assert.equal(observer.disconnectCalls, 2);
	assert.equal(observer.targets.size, 0);
});
