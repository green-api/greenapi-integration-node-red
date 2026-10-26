import type { NodeStatus } from "node-red";
import { STATUS_TEXT_MAX_LENGTH, WEBHOOK_URL_SET_MARKER } from "./defaults";

export function errorText(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export function isWebhookUrlSetError(error: unknown): boolean {
	return errorText(error).toLowerCase().includes(WEBHOOK_URL_SET_MARKER);
}

export function shorten(text: string): string {
	return text.length > STATUS_TEXT_MAX_LENGTH ? `${text.slice(0, STATUS_TEXT_MAX_LENGTH - 1)}…` : text;
}

export function errorStatus(error: unknown): NodeStatus {
	return {fill: "red", shape: "ring", text: shorten(errorText(error))};
}

export const STATUS_NO_INSTANCE: NodeStatus = {fill: "red", shape: "ring", text: "instance not configured"};
export const STATUS_SENDING: NodeStatus = {fill: "blue", shape: "dot", text: "sending"};
export const STATUS_SENT: NodeStatus = {fill: "green", shape: "dot", text: "sent"};
export const STATUS_UPLOADED: NodeStatus = {fill: "green", shape: "dot", text: "uploaded"};
export const STATUS_CALLING: NodeStatus = {fill: "blue", shape: "dot", text: "calling"};
export const STATUS_DONE: NodeStatus = {fill: "green", shape: "dot", text: "done"};
export const STATUS_LISTENING: NodeStatus = {fill: "green", shape: "dot", text: "listening"};
export const STATUS_WEBHOOK_URL_SET: NodeStatus = {fill: "red", shape: "ring", text: "clear webhookUrl on the instance to poll"};
