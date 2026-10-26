import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toParams } from "../src/values";

describe("toParams", () => {
	it("returns undefined when nothing is set", () => {
		assert.equal(toParams(undefined, "query"), undefined);
		assert.equal(toParams("", "query"), undefined);
		assert.equal(toParams({}, "query"), undefined);
		assert.equal(toParams({minutes: null}, "query"), undefined);
	});

	it("keeps strings and numbers, turns booleans into strings", () => {
		assert.deepEqual(toParams({minutes: 60, idMessage: "A", flag: true}, "query"), {minutes: 60, idMessage: "A", flag: "true"});
	});

	it("rejects values that cannot be flat parameters", () => {
		assert.throws(() => toParams("minutes=60", "query"), /query must be an object/);
		assert.throws(() => toParams([1], "fields"), /fields must be an object/);
		assert.throws(() => toParams({a: {b: 1}}, "fields"), /fields parameter "a"/);
	});
});
