import { formatPhoneNumber } from "@green-api/greenapi-integration";
import { MAX_PHONE_DIGITS, MIN_PHONE_DIGITS, NUMERIC_CHAT_ID, PHONE_CHAT_ID, WHATSAPP_GROUP_ID } from "./defaults";
import type { Messenger } from "./types";

export function toChatId(raw: unknown, messenger: Messenger): string | null {
	if (typeof raw !== "string" && typeof raw !== "number") {
		return null;
	}
	const trimmed = String(raw).trim();
	if (WHATSAPP_GROUP_ID.test(trimmed) || PHONE_CHAT_ID.test(trimmed)) {
		return trimmed;
	}
	if (messenger !== "whatsapp" && NUMERIC_CHAT_ID.test(trimmed)) {
		return trimmed;
	}
	const digits = trimmed.replace(/\D/g, "");
	if (digits.length < MIN_PHONE_DIGITS || digits.length > MAX_PHONE_DIGITS) {
		return null;
	}
	return formatPhoneNumber(digits);
}
