import type { GreenApiWebhook, ReceiveNotificationResponse } from "@green-api/greenapi-integration";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NotificationPoller, type NotificationQueueClient } from "../src/poller";
import type { NotificationListener } from "../src/types";

const OPTIONS = {receiveTimeoutSeconds: 5, retryDelayMs: 10};

function notification(receiptId: number): ReceiveNotificationResponse {
	return {receiptId, body: {typeWebhook: "incomingMessageReceived"} as GreenApiWebhook};
}

function queueClient(responses: Array<ReceiveNotificationResponse | null | Error>) {
	const deleted: number[] = [];
	let pending: (() => void) | null = null;
	const client: NotificationQueueClient = {
		receiveNotification: async () => {
			const next = responses.shift();
			if (next === undefined) {
				await new Promise<void>(resolve => {
					pending = resolve;
				});
				return null;
			}
			if (next instanceof Error) {
				throw next;
			}
			return next;
		},
		deleteNotification: async receiptId => {
			deleted.push(receiptId);
			return {result: true};
		},
	};
	return {client, deleted, release: () => pending?.()};
}

function recorder(): NotificationListener & {bodies: GreenApiWebhook[]; errors: string[]; recovered: number} {
	const state = {bodies: [] as GreenApiWebhook[], errors: [] as string[], recovered: 0};
	return Object.assign(state, {
		onNotification: (body: GreenApiWebhook) => state.bodies.push(body),
		onPollError: (error: Error) => state.errors.push(error.message),
		onPollRecovered: () => state.recovered++,
	});
}

const tick = () => new Promise(resolve => setTimeout(resolve, 30));

describe("NotificationPoller", () => {
	it("outputs each notification to every listener, then deletes it", async () => {
		const {client, deleted, release} = queueClient([notification(1), null, notification(2)]);
		const poller = new NotificationPoller(client, OPTIONS);
		const first = recorder();
		const second = recorder();
		poller.subscribe(first);
		poller.subscribe(second);
		await tick();
		assert.equal(first.bodies.length, 2);
		assert.equal(second.bodies.length, 2);
		assert.deepEqual(deleted, [1, 2]);
		poller.unsubscribe(first);
		poller.unsubscribe(second);
		assert.equal(poller.isRunning, false);
		release();
	});

	it("reports errors, retries and reports recovery", async () => {
		const {client, deleted, release} = queueClient([new Error("Message cannot be received because custom webhook url is set"), notification(3)]);
		const poller = new NotificationPoller(client, OPTIONS);
		const listener = recorder();
		poller.subscribe(listener);
		await tick();
		assert.equal(listener.errors.length, 1);
		assert.equal(listener.recovered, 1);
		assert.deepEqual(deleted, [3]);
		poller.stop();
		release();
	});

	it("starts a new poll only after the previous request finished", async () => {
		let calls = 0;
		let active = 0;
		let maxActive = 0;
		const resolvers: Array<(value: ReceiveNotificationResponse | null) => void> = [];
		const client: NotificationQueueClient = {
			receiveNotification: () => {
				calls++;
				active++;
				maxActive = Math.max(maxActive, active);
				return new Promise(resolve => resolvers.push(value => {
					active--;
					resolve(value);
				}));
			},
			deleteNotification: async () => ({result: true}),
		};
		const poller = new NotificationPoller(client, OPTIONS);
		const first = recorder();
		poller.subscribe(first);
		await tick();
		poller.unsubscribe(first);
		const second = recorder();
		poller.subscribe(second);
		await tick();
		assert.equal(calls, 1);
		resolvers[0](notification(7));
		await tick();
		assert.equal(calls, 2);
		assert.equal(first.bodies.length + second.bodies.length, 0);
		resolvers[1](notification(7));
		await tick();
		assert.equal(second.bodies.length, 1);
		assert.equal(maxActive, 1);
		poller.stop();
		resolvers[resolvers.length - 1](null);
	});

	it("does not output or delete a notification that arrives after stop", async () => {
		let resolveReceive: (value: ReceiveNotificationResponse) => void = () => undefined;
		const deleted: number[] = [];
		const client: NotificationQueueClient = {
			receiveNotification: () => new Promise(resolve => {
				resolveReceive = resolve;
			}),
			deleteNotification: async receiptId => {
				deleted.push(receiptId);
				return {result: true};
			},
		};
		const poller = new NotificationPoller(client, OPTIONS);
		const listener = recorder();
		poller.subscribe(listener);
		poller.stop();
		resolveReceive(notification(4));
		await tick();
		assert.equal(listener.bodies.length, 0);
		assert.deepEqual(deleted, []);
	});
});
