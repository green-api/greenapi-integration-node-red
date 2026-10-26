import { GreenApiClient } from "@green-api/greenapi-integration";
import type { NodeAPI } from "node-red";
import {
	DEFAULT_TYPE_INSTANCE,
	NODE_TYPE_INSTANCE,
	POLL_RETRY_DELAY_MS,
	RECEIVE_TIMEOUT_SECONDS,
	TYPE_INSTANCE_TO_MESSENGER,
} from "../defaults";
import { NotificationPoller } from "../poller";
import type { InstanceCredentials, InstanceNode, InstanceNodeDef, Messenger } from "../types";

export = function (RED: NodeAPI): void {
	function GreenApiInstanceNode(this: InstanceNode, def: InstanceNodeDef): void {
		RED.nodes.createNode(this, def);
		const node = this;
		const idInstance = node.credentials?.idInstance?.trim();
		const apiTokenInstance = node.credentials?.apiTokenInstance?.trim();
		let messenger: Promise<Messenger> | null = null;

		node.client = idInstance && apiTokenInstance
			? new GreenApiClient(
				{
					idInstance: Number(idInstance),
					apiTokenInstance,
					apiUrl: def.apiUrl?.trim() || undefined,
					mediaUrl: def.mediaUrl?.trim() || undefined,
				},
				{logger: {info: (message, context) => node.debug(`${message} ${JSON.stringify(context ?? {})}`)}},
			)
			: null;
		node.poller = node.client
			? new NotificationPoller(node.client, {receiveTimeoutSeconds: RECEIVE_TIMEOUT_SECONDS, retryDelayMs: POLL_RETRY_DELAY_MS})
			: null;

		node.getMessenger = () => {
			if (!node.client) {
				return Promise.reject(new Error("GREEN-API instance credentials are missing"));
			}
			if (!messenger) {
				const client = node.client;
				messenger = client.getSettings().then(settings => {
					const typeInstance = settings.typeInstance ?? DEFAULT_TYPE_INSTANCE;
					const detected = TYPE_INSTANCE_TO_MESSENGER[typeInstance];
					if (!detected) {
						throw new Error(`Instances of type "${typeInstance}" are not supported`);
					}
					return detected;
				});
				messenger.catch(() => {
					messenger = null;
				});
			}
			return messenger;
		};

		node.on("close", () => {
			node.poller?.stop();
		});
	}

	RED.nodes.registerType<InstanceNode, InstanceNodeDef, {}, InstanceCredentials>(NODE_TYPE_INSTANCE, GreenApiInstanceNode, {
		credentials: {
			idInstance: {type: "text"},
			apiTokenInstance: {type: "password"},
		},
	});
};
