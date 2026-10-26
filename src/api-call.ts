import type { GreenApiClient } from "@green-api/greenapi-integration";
import { METHOD_NAME } from "./defaults";
import type { ApiHttpMethod } from "./types";
import { requiredFile, requiredFileName, toParams } from "./values";

export type ApiClient = Pick<GreenApiClient, "request" | "requestWithFile">;

export function callApi(
	client: ApiClient,
	httpMethod: ApiHttpMethod,
	method: unknown,
	value: (property: string) => unknown,
): Promise<unknown> {
	if (typeof method !== "string" || !METHOD_NAME.test(method)) {
		throw new Error("method must be a GREEN-API method name, e.g. getContacts");
	}
	switch (httpMethod) {
		case "get":
			return client.request("get", method, undefined, toParams(value("query"), "query"));
		case "delete":
			return client.request("delete", method);
		case "upload":
			return client.requestWithFile(
				method,
				{data: requiredFile(value("file")), fileName: requiredFileName(value("fileName"))},
				toParams(value("fields"), "fields"),
			);
		default:
			return client.request("post", method, value("body") ?? {}, undefined);
	}
}
