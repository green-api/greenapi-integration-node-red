import type { Node, NodeAPI, NodeMessage } from "node-red";
import type { TypedPropertyDef } from "./types";

export function evaluateTypedProperty(
	RED: NodeAPI,
	node: Node,
	def: TypedPropertyDef,
	property: string,
	msg: NodeMessage,
): unknown {
	const value = def[property];
	const type = def[`${property}Type`];
	if (typeof value !== "string" || value === "") {
		return undefined;
	}
	return RED.util.evaluateNodeProperty(value, typeof type === "string" && type !== "" ? type : "str", node, msg);
}
