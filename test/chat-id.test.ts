import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toChatId } from "../src/chat-id";

describe("toChatId", () => {
	it("turns a formatted phone into a WhatsApp chat id", () => {
		assert.equal(toChatId("+7 (700) 648-44-93", "whatsapp"), "77006484493@c.us");
	});

	it("keeps chat ids as they are", () => {
		assert.equal(toChatId("77006484493@c.us", "whatsapp"), "77006484493@c.us");
		assert.equal(toChatId("120363043968066561@g.us", "whatsapp"), "120363043968066561@g.us");
	});

	it("keeps any id with @ as it is, including lid and channels", () => {
		assert.equal(toChatId("115736668303446@lid", "whatsapp"), "115736668303446@lid");
		assert.equal(toChatId(" 120363043968066561@newsletter ", "whatsapp"), "120363043968066561@newsletter");
	});

	it("treats plain numbers as chat ids on Telegram and MAX, as phones on WhatsApp", () => {
		assert.equal(toChatId("7203921144", "telegram"), "7203921144");
		assert.equal(toChatId("-1001234567890", "telegram"), "-1001234567890");
		assert.equal(toChatId(16976233, "max"), "16976233");
		assert.equal(toChatId("77006484493", "whatsapp"), "77006484493@c.us");
	});

	it("turns a formatted phone into a phone chat id on Telegram", () => {
		assert.equal(toChatId("+7 977 099-61-92", "telegram"), "79770996192@c.us");
	});

	it("rejects values that are not chat ids or phones", () => {
		assert.equal(toChatId("", "whatsapp"), null);
		assert.equal(toChatId("123", "whatsapp"), null);
		assert.equal(toChatId({}, "whatsapp"), null);
		assert.equal(toChatId(undefined, "telegram"), null);
	});
});
