import type { GreenApiClient, GreenApiWebhook } from "@green-api/greenapi-integration";
import type { Node, NodeDef } from "node-red";
import type { NotificationPoller } from "./poller";

export type Messenger = "whatsapp" | "telegram" | "max";

export type SendType = "text" | "fileUrl" | "fileUpload" | "location" | "contact" | "poll" | "uploadFile";

export type ReceiveMode = "polling" | "webhook";

export type ApiHttpMethod = "get" | "post" | "upload" | "delete";

export interface InstanceCredentials {
	idInstance?: string;
	apiTokenInstance?: string;
}

export interface InstanceNodeDef extends NodeDef {
	apiUrl: string;
	mediaUrl: string;
}

export interface InstanceNode extends Node<InstanceCredentials> {
	client: GreenApiClient | null;
	poller: NotificationPoller | null;
	getMessenger(): Promise<Messenger>;
}

export interface NotificationListener {
	onNotification(body: GreenApiWebhook): void;
	onPollError(error: Error): void;
	onPollRecovered(): void;
}

export interface TypedPropertyDef {
	[property: string]: unknown;
}

export interface SendNodeDef extends NodeDef, TypedPropertyDef {
	instance: string;
	sendType: SendType;
	multipleAnswers: boolean;
}

export interface ReceiveNodeDef extends NodeDef {
	instance: string;
	mode: ReceiveMode;
	path: string;
	types: string[];
}

export interface ReceiveCredentials {
	webhookUrlToken?: string;
}

export interface ApiNodeDef extends NodeDef, TypedPropertyDef {
	instance: string;
	httpMethod: ApiHttpMethod;
}

export interface SendValues {
	chatId?: unknown;
	quotedMessageId?: unknown;
	message?: unknown;
	urlFile?: unknown;
	fileName?: unknown;
	caption?: unknown;
	file?: unknown;
	latitude?: unknown;
	longitude?: unknown;
	nameLocation?: unknown;
	address?: unknown;
	phoneContact?: unknown;
	firstName?: unknown;
	lastName?: unknown;
	company?: unknown;
	options?: unknown;
	multipleAnswers?: boolean;
}
