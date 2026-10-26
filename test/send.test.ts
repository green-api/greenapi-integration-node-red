import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { send, type SendClient } from "../src/send";

function fakeClient(): {client: SendClient; calls: Array<{method: string; payload: unknown}>} {
	const calls: Array<{method: string; payload: unknown}> = [];
	const record = (method: string) => async (payload: unknown) => {
		calls.push({method, payload});
		return {idMessage: "1"};
	};
	const client = {
		sendMessage: record("sendMessage"),
		sendFileByUrl: record("sendFileByUrl"),
		sendFileByUpload: async (payload: unknown) => {
			calls.push({method: "sendFileByUpload", payload});
			return {idMessage: "1", urlFile: "u"};
		},
		sendLocation: record("sendLocation"),
		sendContact: record("sendContact"),
		sendPoll: record("sendPoll"),
		uploadFile: async (...args: unknown[]) => {
			calls.push({method: "uploadFile", payload: args});
			return {urlFile: "https://example.com/f"};
		},
	} as unknown as SendClient;
	return {client, calls};
}

describe("send", () => {
	it("sends text to a phone", async () => {
		const {client, calls} = fakeClient();
		const response = await send(client, "whatsapp", "text", {chatId: "+77006484493", message: "123"});
		assert.deepEqual(response, {idMessage: "1"});
		assert.deepEqual(calls, [{method: "sendMessage", payload: {chatId: "77006484493@c.us", quotedMessageId: undefined, message: "123"}}]);
	});

	it("stringifies an object message", async () => {
		const {client, calls} = fakeClient();
		await send(client, "whatsapp", "text", {chatId: "77006484493", message: {a: 1}});
		assert.equal((calls[0].payload as {message: string}).message, "{\"a\":1}");
	});

	it("uploads a Buffer with the base name of a path", async () => {
		const {client, calls} = fakeClient();
		const data = Buffer.from("abc");
		await send(client, "telegram", "fileUpload", {chatId: "7203921144", file: data, fileName: "/tmp/photos/cat.jpg", caption: ""});
		assert.deepEqual(calls[0].payload, {
			chatId: "7203921144",
			quotedMessageId: undefined,
			caption: undefined,
			file: {data, fileName: "cat.jpg"},
		});
	});

	it("uploads only, without a chat id, and returns the file URL", async () => {
		const {client, calls} = fakeClient();
		const data = Buffer.from("abc");
		const response = await send(client, "whatsapp", "uploadFile", {file: data, fileName: "C:\\photos\\cat.jpg"});
		assert.deepEqual(response, {urlFile: "https://example.com/f"});
		assert.deepEqual(calls, [{method: "uploadFile", payload: [data, "cat.jpg"]}]);
	});

	it("builds poll options from lines", async () => {
		const {client, calls} = fakeClient();
		await send(client, "whatsapp", "poll", {chatId: "77006484493", message: "Q", options: "a\n\n b ", multipleAnswers: true});
		assert.deepEqual((calls[0].payload as {options: unknown}).options, [{optionName: "a"}, {optionName: "b"}]);
	});

	it("parses location numbers and contact phone digits", async () => {
		const {client, calls} = fakeClient();
		await send(client, "whatsapp", "location", {chatId: "77006484493", latitude: "51.1", longitude: 71.4});
		await send(client, "whatsapp", "contact", {chatId: "77006484493", phoneContact: "+7 700 648 44 93", firstName: "A"});
		assert.equal((calls[0].payload as {latitude: number}).latitude, 51.1);
		assert.equal((calls[1].payload as {contact: {phoneContact: number}}).contact.phoneContact, 77006484493);
	});

	it("rejects missing fields before calling GREEN-API", async () => {
		const {client, calls} = fakeClient();
		await assert.rejects(send(client, "whatsapp", "text", {chatId: "77006484493"}), /message is required/);
		await assert.rejects(send(client, "whatsapp", "text", {chatId: "abc", message: "1"}), /is not a chat id/);
		await assert.rejects(send(client, "whatsapp", "fileUpload", {chatId: "77006484493", file: 5, fileName: "a"}), /file must be a Buffer/);
		await assert.rejects(send(client, "whatsapp", "location", {chatId: "77006484493", latitude: "x", longitude: 1}), /latitude must be a number/);
		assert.equal(calls.length, 0);
	});
});
