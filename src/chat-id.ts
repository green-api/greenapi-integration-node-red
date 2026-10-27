import { formatPhoneNumber } from "@green-api/greenapi-integration";
import { CHAT_ID_SEPARATOR, MAX_PHONE_DIGITS, MIN_PHONE_DIGITS, NUMERIC_CHAT_ID } from "./defaults";
import type { Messenger } from "./types";

export function toChatId(raw: unknown, messenger: Messenger): string | null {
	if (typeof raw !== "string" && typeof raw !== "number") {
		return null;
	}
	const trimmed = String(raw).trim();
	if (trimmed.includes(CHAT_ID_SEPARATOR)) {
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
