import type { GreenApiWebhook } from "@green-api/greenapi-integration";
import type { Node, NodeAPI } from "node-red";
import { NODE_TYPE_RECEIVE } from "../defaults";
import { errorStatus, errorText, isWebhookUrlSetError, STATUS_LISTENING, STATUS_NO_INSTANCE, STATUS_WEBHOOK_URL_SET } from "../status";
import type { InstanceNode, NotificationListener, ReceiveCredentials, ReceiveNodeDef } from "../types";
import { addWebhookRoute, normalizePath } from "../webhook-route";

export = function (RED: NodeAPI): void {
	function GreenApiReceiveNode(this: Node<ReceiveCredentials>, def: ReceiveNodeDef): void {
		RED.nodes.createNode(this, def);
		const node = this;
		const types = new Set(Array.isArray(def.types) ? def.types : []);

		const emit = (body: GreenApiWebhook) => {
			if (types.size > 0 && !types.has(body.typeWebhook)) {
				return;
			}
			node.send({payload: body, topic: body.typeWebhook});
		};

		if (def.mode === "webhook") {
			if (!RED.httpNode) {
				node.status({fill: "red", shape: "ring", text: "httpNodeRoot is disabled"});
				node.error("Webhook mode needs Node-RED HTTP nodes enabled (httpNodeRoot)");
				return;
			}
			const path = normalizePath(def.path || `/greenapi/${node.id}`);
			const removeRoute = addWebhookRoute(RED, path, node.credentials?.webhookUrlToken?.trim() || undefined, emit);
			node.status({fill: "green", shape: "dot", text: `POST ${path}`});
			node.on("close", () => removeRoute());
			return;
		}

		const instance = RED.nodes.getNode(def.instance) as InstanceNode | null;
		const poller = instance?.poller;
		if (!poller) {
			node.status(STATUS_NO_INSTANCE);
			return;
		}
		let lastError: string | null = null;
		const listener: NotificationListener = {
			onNotification: emit,
			onPollError: error => {
				node.status(isWebhookUrlSetError(error) ? STATUS_WEBHOOK_URL_SET : errorStatus(error));
				const message = errorText(error);
				if (message !== lastError) {
					lastError = message;
					node.warn(message);
				}
			},
			onPollRecovered: () => {
				lastError = null;
				node.status(STATUS_LISTENING);
			},
		};
		poller.subscribe(listener);
		node.status(STATUS_LISTENING);
		node.on("close", () => poller.unsubscribe(listener));
	}

	RED.nodes.registerType<Node<ReceiveCredentials>, ReceiveNodeDef, {}, ReceiveCredentials>(NODE_TYPE_RECEIVE, GreenApiReceiveNode, {
		credentials: {
			webhookUrlToken: {type: "password"},
		},
	});
};
