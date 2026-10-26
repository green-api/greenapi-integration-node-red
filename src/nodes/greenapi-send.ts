import type { Node, NodeAPI } from "node-red";
import { NODE_TYPE_SEND, SEND_TYPED_PROPERTIES } from "../defaults";
import { send } from "../send";
import { errorStatus, STATUS_NO_INSTANCE, STATUS_SENDING, STATUS_SENT, STATUS_UPLOADED } from "../status";
import { evaluateTypedProperty } from "../typed-property";
import type { InstanceNode, SendNodeDef, SendValues } from "../types";

export = function (RED: NodeAPI): void {
	function GreenApiSendNode(this: Node, def: SendNodeDef): void {
		RED.nodes.createNode(this, def);
		const node = this;
		const instance = RED.nodes.getNode(def.instance) as InstanceNode | null;
		if (!instance?.client) {
			node.status(STATUS_NO_INSTANCE);
		}

		node.on("input", async (msg, sendMsg, done) => {
			if (!instance?.client) {
				node.status(STATUS_NO_INSTANCE);
				done(new Error("Select a configured GREEN-API instance"));
				return;
			}
			try {
				node.status(STATUS_SENDING);
				const values: SendValues = {multipleAnswers: def.multipleAnswers === true};
				for (const property of SEND_TYPED_PROPERTIES) {
					values[property] = evaluateTypedProperty(RED, node, def, property, msg);
				}
				const messenger = await instance.getMessenger();
				msg.payload = await send(instance.client, messenger, def.sendType, values);
				node.status(def.sendType === "uploadFile" ? STATUS_UPLOADED : STATUS_SENT);
				sendMsg(msg);
				done();
			} catch (error) {
				node.status(errorStatus(error));
				done(error instanceof Error ? error : new Error(String(error)));
			}
		});
	}

	RED.nodes.registerType(NODE_TYPE_SEND, GreenApiSendNode);
};
