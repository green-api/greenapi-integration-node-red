import assert from "node:assert/strict";
import { after, afterEach, before, describe, it } from "node:test";
import helper from "node-red-node-test-helper";
import apiNode from "../src/nodes/greenapi-api";
import instanceNode from "../src/nodes/greenapi-instance";
import receiveNode from "../src/nodes/greenapi-receive";
import sendNode from "../src/nodes/greenapi-send";
import type { InstanceNode } from "../src/types";

helper.init(require.resolve("node-red"));

const CLOSED_PORT_URL = "http://127.0.0.1:9";
const CREDENTIALS = {i1: {idInstance: "1101000001", apiTokenInstance: "token"}};

function load(flow: unknown[]): Promise<void> {
	return new Promise(resolve => helper.load([instanceNode, sendNode, receiveNode, apiNode], flow, CREDENTIALS, resolve));
}

function nextMessage(node: {on(event: "input", listener: (msg: Record<string, unknown>) => void): void}): Promise<Record<string, unknown>> {
	return new Promise(resolve => node.on("input", resolve));
}

describe("nodes", () => {
	before(() => new Promise<void>(resolve => helper.startServer(resolve)));
	after(() => new Promise<void>(resolve => helper.stopServer(resolve)));
	afterEach(() => helper.unload());

	it("creates a client from the instance credentials", async () => {
		await load([{id: "i1", type: "greenapi-instance", apiUrl: "https://7103.api.greenapi.com"}]);
		const instance = helper.getNode("i1") as InstanceNode;
		assert.ok(instance.client);
		assert.ok(instance.poller);
	});

	it("sends text from msg and outputs the GREEN-API response", async () => {
		await load([
			{id: "i1", type: "greenapi-instance", apiUrl: CLOSED_PORT_URL},
			{
				id: "s1", type: "greenapi-send", instance: "i1", sendType: "text",
				chatId: "chatId", chatIdType: "msg", message: "payload", messageType: "msg", wires: [["h1"]],
			},
			{id: "h1", type: "helper"},
		]);
		const instance = helper.getNode("i1") as InstanceNode;
		const sent: unknown[] = [];
		instance.getMessenger = async () => "whatsapp";
		Object.assign(instance.client!, {
			sendMessage: async (payload: unknown) => {
				sent.push(payload);
				return {idMessage: "ID"};
			},
		});
		const output = nextMessage(helper.getNode("h1"));
		helper.getNode("s1").receive({payload: "123", chatId: "77006484493"});
		assert.deepEqual((await output).payload, {idMessage: "ID"});
		assert.deepEqual(sent, [{chatId: "77006484493@c.us", quotedMessageId: undefined, message: "123"}]);
	});

	it("calls any method through the api node", async () => {
		await load([
			{id: "i1", type: "greenapi-instance", apiUrl: CLOSED_PORT_URL},
			{id: "a1", type: "greenapi-api", instance: "i1", httpMethod: "post", method: "getChatHistory", methodType: "str", body: "payload", bodyType: "msg", wires: [["h1"]]},
			{id: "h1", type: "helper"},
		]);
		const instance = helper.getNode("i1") as InstanceNode;
		const calls: unknown[] = [];
		Object.assign(instance.client!, {
			request: async (...args: unknown[]) => {
				calls.push(args);
				return [];
			},
		});
		const output = nextMessage(helper.getNode("h1"));
		helper.getNode("a1").receive({payload: {chatId: "1@c.us", count: 10}});
		assert.deepEqual((await output).payload, []);
		assert.deepEqual(calls, [["post", "getChatHistory", {chatId: "1@c.us", count: 10}, undefined]]);
	});

	it("passes query parameters on GET through the api node", async () => {
		await load([
			{id: "i1", type: "greenapi-instance", apiUrl: CLOSED_PORT_URL},
			{id: "a1", type: "greenapi-api", instance: "i1", httpMethod: "get", method: "lastIncomingMessages", methodType: "str", query: "{\"minutes\": 60}", queryType: "json", wires: [["h1"]]},
			{id: "h1", type: "helper"},
		]);
		const instance = helper.getNode("i1") as InstanceNode;
		const calls: unknown[] = [];
		Object.assign(instance.client!, {
			request: async (...args: unknown[]) => {
				calls.push(args);
				return [];
			},
		});
		const output = nextMessage(helper.getNode("h1"));
		helper.getNode("a1").receive({});
		await output;
		assert.deepEqual(calls, [["get", "lastIncomingMessages", undefined, {minutes: 60}]]);
	});

	it("uploads a file through the api node", async () => {
		await load([
			{id: "i1", type: "greenapi-instance", apiUrl: CLOSED_PORT_URL},
			{
				id: "a1", type: "greenapi-api", instance: "i1", httpMethod: "upload", method: "setGroupPicture", methodType: "str",
				file: "payload", fileType: "msg", fileName: "filename", fileNameType: "msg", fields: "{\"groupId\": \"1-2@g.us\"}", fieldsType: "json",
				wires: [["h1"]],
			},
			{id: "h1", type: "helper"},
		]);
		const instance = helper.getNode("i1") as InstanceNode;
		const calls: unknown[] = [];
		Object.assign(instance.client!, {
			requestWithFile: async (...args: unknown[]) => {
				calls.push(args);
				return {setGroupPicture: true};
			},
		});
		const data = Buffer.from("jpg");
		const output = nextMessage(helper.getNode("h1"));
		helper.getNode("a1").receive({payload: data, filename: "C:\\pictures\\group.jpg"});
		assert.deepEqual((await output).payload, {setGroupPicture: true});
		assert.deepEqual(calls, [["setGroupPicture", {data, fileName: "group.jpg"}, {groupId: "1-2@g.us"}]]);
	});

	it("outputs only the checked notification types in polling mode", async () => {
		await load([
			{id: "i1", type: "greenapi-instance", apiUrl: CLOSED_PORT_URL},
			{id: "r1", type: "greenapi-receive", instance: "i1", mode: "polling", types: ["incomingMessageReceived"], wires: [["h1"]]},
			{id: "h1", type: "helper"},
		]);
		const instance = helper.getNode("i1") as InstanceNode;
		instance.poller!.stop();
		const listeners = (instance.poller as unknown as {listeners: Set<{onNotification(body: unknown): void}>}).listeners;
		const output = nextMessage(helper.getNode("h1"));
		listeners.forEach(listener => {
			listener.onNotification({typeWebhook: "outgoingMessageStatus"});
			listener.onNotification({typeWebhook: "incomingMessageReceived", idMessage: "X"});
		});
		const msg = await output;
		assert.equal(msg.topic, "incomingMessageReceived");
		assert.deepEqual(msg.payload, {typeWebhook: "incomingMessageReceived", idMessage: "X"});
	});
});
