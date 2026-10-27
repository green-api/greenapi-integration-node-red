import type { GreenApiClient, SendFileByUploadResponse, SendResponse, UploadFile } from "@green-api/greenapi-integration";
import { toChatId } from "./chat-id";
import type { Messenger, SendType, SendValues } from "./types";
import { optionalText, requiredFile, requiredFileName, requiredNumber, requiredText } from "./values";

export type SendClient = Pick<GreenApiClient, "sendMessage" | "sendFileByUrl" | "sendFileByUpload" | "sendLocation" | "sendContact" | "sendPoll" | "uploadFile" | "request">;

function pollOptions(value: unknown): Array<{optionName: string}> {
	const items = Array.isArray(value) ? value : typeof value === "string" ? value.split(/\r?\n/) : [];
	const options = items
		.map(item => typeof item === "object" && item !== null && "optionName" in item ? String(item.optionName) : String(item))
		.map(option => option.trim())
		.filter(option => option !== "")
		.map(optionName => ({optionName}));
	if (options.length === 0) {
		throw new Error("options must be an array of strings or one option per line");
	}
	return options;
}

export async function send(
	client: SendClient,
	messenger: Messenger,
	sendType: SendType,
	values: SendValues,
): Promise<SendResponse | SendFileByUploadResponse | UploadFile> {
	if (sendType === "uploadFile") {
		return client.uploadFile(requiredFile(values.file), requiredFileName(values.fileName));
	}
	const chatId = toChatId(values.chatId, messenger);
	if (!chatId) {
		throw new Error(`chatId "${String(values.chatId ?? "")}" is not a chat id or phone number`);
	}
	const quotedMessageId = optionalText(values.quotedMessageId);

	switch (sendType) {
		case "text":
			return client.sendMessage({chatId, quotedMessageId, message: requiredText(values.message, "message")});
		case "fileUrl":
			return client.sendFileByUrl({
				chatId,
				quotedMessageId,
				caption: optionalText(values.caption),
				file: {url: requiredText(values.urlFile, "urlFile"), fileName: requiredFileName(values.fileName)},
			});
		case "fileUpload":
			return client.sendFileByUpload({
				chatId,
				quotedMessageId,
				caption: optionalText(values.caption),
				file: {data: requiredFile(values.file), fileName: requiredFileName(values.fileName)},
			});
		case "location":
			return client.sendLocation({
				chatId,
				quotedMessageId,
				latitude: requiredNumber(values.latitude, "latitude"),
				longitude: requiredNumber(values.longitude, "longitude"),
				nameLocation: optionalText(values.nameLocation),
				address: optionalText(values.address),
			});
		case "contact":
			if (messenger === "max") {
				return client.request<SendResponse>("post", "sendContact", {
					chatId,
					quotedMessageId,
					contact: {chatId: requiredText(values.contactChatId, "contactChatId").trim()},
				});
			}
			return client.sendContact({
				chatId,
				quotedMessageId,
				contact: {
					phoneContact: requiredNumber(String(values.phoneContact ?? "").replace(/\D/g, ""), "phoneContact"),
					firstName: optionalText(values.firstName),
					lastName: optionalText(values.lastName),
					company: optionalText(values.company),
				},
			});
		case "poll":
			if (messenger === "max") {
				return client.request<SendResponse>("post", "sendPoll", {
					chatId,
					quotedMessageId,
					message: requiredText(values.message, "message"),
					options: pollOptions(values.options),
				});
			}
			return client.sendPoll({
				chatId,
				quotedMessageId,
				message: requiredText(values.message, "message"),
				options: pollOptions(values.options),
				multipleAnswers: values.multipleAnswers === true,
			});
		default:
			throw new Error(`Unknown send type "${String(sendType)}"`);
	}
}
