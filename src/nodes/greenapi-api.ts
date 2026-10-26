import type { Node, NodeAPI } from "node-red";
import { callApi } from "../api-call";
import { NODE_TYPE_API } from "../defaults";
import { errorStatus, STATUS_CALLING, STATUS_DONE, STATUS_NO_INSTANCE } from "../status";
import { evaluateTypedProperty } from "../typed-property";
import type { ApiNodeDef, InstanceNode } from "../types";

export = function (RED: NodeAPI): void {
	function GreenApiApiNode(this: Node, def: ApiNodeDef): void {
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
				const value = (property: string) => evaluateTypedProperty(RED, node, def, property, msg);
				node.status(STATUS_CALLING);
				msg.payload = await callApi(instance.client, def.httpMethod, value("method"), value);
				node.status(STATUS_DONE);
				sendMsg(msg);
				done();
			} catch (error) {
				node.status(errorStatus(error));
				done(error instanceof Error ? error : new Error(String(error)));
			}
		});
	}

	RED.nodes.registerType(NODE_TYPE_API, GreenApiApiNode);
};
