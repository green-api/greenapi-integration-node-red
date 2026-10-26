import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { type ApiClient, callApi } from "../src/api-call";

function fakeClient() {
	const calls: unknown[][] = [];
	const client = {
		request: async (...args: unknown[]) => {
			calls.push(["request", ...args]);
			return "ok";
		},
		requestWithFile: async (...args: unknown[]) => {
			calls.push(["requestWithFile", ...args]);
			return "ok";
		},
	} as unknown as ApiClient;
	return {client, calls};
}

function values(map: Record<string, unknown>) {
	return (property: string) => map[property];
}

describe("callApi", () => {
	it("sends GET with query parameters", async () => {
		const {client, calls} = fakeClient();
		await callApi(client, "get", "getStatusStatistic", values({query: {idMessage: "A"}}));
		assert.deepEqual(calls, [["request", "get", "getStatusStatistic", undefined, {idMessage: "A"}]]);
	});

	it("sends POST with a JSON body, empty object when none is set", async () => {
		const {client, calls} = fakeClient();
		await callApi(client, "post", "readChat", values({body: {chatId: "1@c.us"}}));
		await callApi(client, "post", "reboot", values({}));
		assert.deepEqual(calls, [
			["request", "post", "readChat", {chatId: "1@c.us"}, undefined],
			["request", "post", "reboot", {}, undefined],
		]);
	});

	it("sends DELETE without a body", async () => {
		const {client, calls} = fakeClient();
		await callApi(client, "delete", "clearWebhooksQueue", values({body: {a: 1}, query: {b: 2}}));
		assert.deepEqual(calls, [["request", "delete", "clearWebhooksQueue"]]);
	});

	it("uploads a file with form fields", async () => {
		const {client, calls} = fakeClient();
		const data = Buffer.from("jpg");
		await callApi(client, "upload", "setGroupPicture", values({file: data, fileName: "/tmp/group.jpg", fields: {groupId: "1-2@g.us"}}));
		assert.deepEqual(calls, [["requestWithFile", "setGroupPicture", {data, fileName: "group.jpg"}, {groupId: "1-2@g.us"}]]);
	});

	it("rejects bad input before calling GREEN-API", async () => {
		const {client, calls} = fakeClient();
		assert.throws(() => callApi(client, "get", "get/../x", values({})), /method must be a GREEN-API method name/);
		assert.throws(() => callApi(client, "upload", "setProfilePicture", values({fileName: "a.jpg"})), /file must be a Buffer/);
		assert.throws(() => callApi(client, "upload", "setProfilePicture", values({file: Buffer.from("x")})), /fileName is required/);
		assert.throws(() => callApi(client, "get", "lastIncomingMessages", values({query: "minutes=60"})), /query must be an object/);
		assert.equal(calls.length, 0);
	});
});
