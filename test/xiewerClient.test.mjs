import assert from "node:assert/strict";
import test from "node:test";

const {
	revokeXiewerObjectUrls,
	clearXiewerSessionMemory,
	noteXiewerSessionToken,
	xiewerObjectUrlCacheSize,
	__testPutXiewerObjectUrl,
} = await import("../.test-build/xiewerClient.mjs");

test("revokeXiewerObjectUrls clears the blob cache", () => {
	clearXiewerSessionMemory();
	revokeXiewerObjectUrls();
	assert.equal(xiewerObjectUrlCacheSize(), 0);

	const fake = "blob:oculus-test-1";
	const revoked = [];
	const original = URL.revokeObjectURL;
	URL.revokeObjectURL = (url) => {
		revoked.push(url);
	};
	try {
		__testPutXiewerObjectUrl("hdr:tok:http://127.0.0.1:47821/file/1", fake);
		assert.equal(xiewerObjectUrlCacheSize(), 1);
		revokeXiewerObjectUrls();
		assert.equal(xiewerObjectUrlCacheSize(), 0);
		assert.deepEqual(revoked, [fake]);
	} finally {
		URL.revokeObjectURL = original;
	}
});

test("noteXiewerSessionToken revokes only when the token rotates", () => {
	clearXiewerSessionMemory();
	revokeXiewerObjectUrls();

	const revoked = [];
	const original = URL.revokeObjectURL;
	URL.revokeObjectURL = (url) => {
		revoked.push(url);
	};
	try {
		assert.equal(noteXiewerSessionToken("token-a"), true);
		__testPutXiewerObjectUrl("hdr:token-a:http://127.0.0.1:47821/file/1", "blob:a");
		assert.equal(noteXiewerSessionToken("token-a"), false);
		assert.equal(xiewerObjectUrlCacheSize(), 1);
		assert.equal(revoked.length, 0);

		assert.equal(noteXiewerSessionToken("token-b"), true);
		assert.equal(xiewerObjectUrlCacheSize(), 0);
		assert.deepEqual(revoked, ["blob:a"]);
	} finally {
		URL.revokeObjectURL = original;
		clearXiewerSessionMemory();
		revokeXiewerObjectUrls();
	}
});
