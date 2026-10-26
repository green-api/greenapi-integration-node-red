import type { GreenApiWebhook } from "@green-api/greenapi-integration";
import express from "express";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import type { NodeAPI } from "node-red";
import { addWebhookRoute, normalizePath } from "../src/webhook-route";

describe("addWebhookRoute", () => {
	const app = express();
	const RED = {httpNode: app, settings: {}} as unknown as NodeAPI;
	const received: GreenApiWebhook[] = [];
	let removeRoute: () => void = () => undefined;
	let server: ReturnType<typeof app.listen>;
	let url = "";

	before(async () => {
		removeRoute = addWebhookRoute(RED, "/greenapi/test", "secret", body => received.push(body));
		await new Promise<void>(resolve => {
			server = app.listen(0, "127.0.0.1", () => resolve());
		});
		url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/greenapi/test`;
	});

	after(() => {
		server.close();
	});

	const post = (body: string, token?: string) => fetch(url, {
		method: "POST",
		headers: {"Content-Type": "application/json", ...(token ? {Authorization: `Bearer ${token}`} : {})},
		body,
	});

	it("outputs a webhook with the right token", async () => {
		const response = await post(JSON.stringify({typeWebhook: "incomingMessageReceived"}), "secret");
		assert.equal(response.status, 200);
		assert.equal(received.length, 1);
		assert.equal(received[0].typeWebhook, "incomingMessageReceived");
	});

	it("rejects a wrong or missing token", async () => {
		assert.equal((await post(JSON.stringify({typeWebhook: "x"}), "wrong")).status, 401);
		assert.equal((await post(JSON.stringify({typeWebhook: "x"}))).status, 401);
		assert.equal(received.length, 1);
	});

	it("rejects a body that is not a GREEN-API webhook", async () => {
		assert.equal((await post(JSON.stringify({a: 1}), "secret")).status, 400);
	});

	it("removes the route", async () => {
		removeRoute();
		assert.equal((await post(JSON.stringify({typeWebhook: "x"}), "secret")).status, 404);
	});

	it("accepts a Basic token sent as is", async () => {
		const basicApp = express();
		const basicReceived: GreenApiWebhook[] = [];
		addWebhookRoute({httpNode: basicApp, settings: {}} as unknown as NodeAPI, "/b", "Basic dXNlcjpwYXNz", body => basicReceived.push(body));
		const basicServer = basicApp.listen(0, "127.0.0.1");
		await new Promise(resolve => basicServer.once("listening", resolve));
		const response = await fetch(`http://127.0.0.1:${(basicServer.address() as AddressInfo).port}/b`, {
			method: "POST",
			headers: {"Content-Type": "application/json", Authorization: "Basic dXNlcjpwYXNz"},
			body: JSON.stringify({typeWebhook: "incomingMessageReceived"}),
		});
		basicServer.close();
		assert.equal(response.status, 200);
		assert.equal(basicReceived.length, 1);
	});

	it("normalizes paths", () => {
		assert.equal(normalizePath(" greenapi/in "), "/greenapi/in");
		assert.equal(normalizePath("/a"), "/a");
	});
});
