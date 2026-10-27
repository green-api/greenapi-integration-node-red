import type { Messenger, SendValues } from "./types";

export const NODE_TYPE_INSTANCE = "greenapi-instance";
export const NODE_TYPE_SEND = "greenapi-send";
export const NODE_TYPE_RECEIVE = "greenapi-receive";
export const NODE_TYPE_API = "greenapi-api";

export const RECEIVE_TIMEOUT_SECONDS = 5;
export const POLL_RETRY_DELAY_MS = 5000;
export const WEBHOOK_URL_SET_MARKER = "webhook url is set";
export const WEBHOOK_MAX_BODY_BYTES = 5 * 1024 * 1024;
export const STATUS_TEXT_MAX_LENGTH = 60;

export const DEFAULT_TYPE_INSTANCE = "whatsapp";
export const TYPE_INSTANCE_TO_MESSENGER: Record<string, Messenger> = {whatsapp: "whatsapp", telegram: "telegram", v3: "max", max: "max"};

export const CHAT_ID_SEPARATOR = "@";
export const NUMERIC_CHAT_ID = /^-?\d+$/;
export const METHOD_NAME = /^[A-Za-z]+$/;
export const MIN_PHONE_DIGITS = 7;
export const MAX_PHONE_DIGITS = 15;

export const SEND_TYPED_PROPERTIES: Array<Exclude<keyof SendValues, "multipleAnswers">> = [
	"chatId",
	"quotedMessageId",
	"message",
	"urlFile",
	"fileName",
	"caption",
	"file",
	"latitude",
	"longitude",
	"nameLocation",
	"address",
	"phoneContact",
	"contactChatId",
	"firstName",
	"lastName",
	"company",
	"options",
];
