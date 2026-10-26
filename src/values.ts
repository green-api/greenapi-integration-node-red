export function isBlank(value: unknown): boolean {
	return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
}

export function optionalText(value: unknown): string | undefined {
	return isBlank(value) ? undefined : String(value);
}

export function requiredText(value: unknown, field: string): string {
	if (isBlank(value)) {
		throw new Error(`${field} is required`);
	}
	return typeof value === "string" ? value : typeof value === "object" ? JSON.stringify(value) : String(value);
}

export function requiredNumber(value: unknown, field: string): number {
	const parsed = typeof value === "number" ? value : Number(requiredText(value, field));
	if (!Number.isFinite(parsed)) {
		throw new Error(`${field} must be a number`);
	}
	return parsed;
}

export function requiredFileName(value: unknown): string {
	const fileName = requiredText(value, "fileName").split(/[\\/]/).pop() ?? "";
	if (fileName === "") {
		throw new Error("fileName must end with a file name");
	}
	return fileName;
}

export function requiredFile(value: unknown): Uint8Array {
	if (value instanceof Uint8Array) {
		return value;
	}
	if (typeof value === "string" && value !== "") {
		return Buffer.from(value);
	}
	throw new Error("file must be a Buffer");
}

export function toParams(value: unknown, field: string): Record<string, string | number> | undefined {
	if (value === undefined || value === null || value === "") {
		return undefined;
	}
	if (typeof value !== "object" || Array.isArray(value)) {
		throw new Error(`${field} must be an object, e.g. {"minutes": 60}`);
	}
	const params: Record<string, string | number> = {};
	for (const [key, item] of Object.entries(value)) {
		if (item === undefined || item === null) {
			continue;
		}
		if (typeof item !== "string" && typeof item !== "number" && typeof item !== "boolean") {
			throw new Error(`${field} parameter "${key}" must be a string, number or boolean`);
		}
		params[key] = typeof item === "boolean" ? String(item) : item;
	}
	return Object.keys(params).length > 0 ? params : undefined;
}
