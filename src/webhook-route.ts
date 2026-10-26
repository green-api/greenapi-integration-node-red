import type { GreenApiWebhook } from "@green-api/greenapi-integration";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { NodeAPI } from "node-red";
import { timingSafeEqual } from "node:crypto";
import { WEBHOOK_MAX_BODY_BYTES } from "./defaults";

interface RouteLayer {
	route?: {path: string; methods: Record<string, boolean>};
}

interface RouterWithStack {
	stack: RouteLayer[];
}

export function normalizePath(path: string): string {
	const trimmed = path.trim();
	return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function sameText(expected: string, provided: string): boolean {
	const expectedBuffer = Buffer.from(expected);
	const providedBuffer = Buffer.from(provided);
	return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}

function tokensMatch(webhookUrlToken: string, header: string | undefined): boolean {
	const expected = /^(Basic|Bearer)\s/i.test(webhookUrlToken) ? webhookUrlToken : `Bearer ${webhookUrlToken}`;
	return sameText(expected, header?.trim() ?? "");
}

function readJsonBody(req: Request): Promise<unknown> {
	if (req.body !== undefined && !Buffer.isBuffer(req.body)) {
		return Promise.resolve(req.body);
	}
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		let size = 0;
		req.on("data", (chunk: Buffer) => {
			size += chunk.length;
			if (size > WEBHOOK_MAX_BODY_BYTES) {
				reject(new Error("Webhook body is too large"));
				req.destroy();
				return;
			}
			chunks.push(chunk);
		});
		req.on("end", () => {
			try {
				resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
			} catch {
				reject(new Error("Webhook body is not valid JSON"));
			}
		});
		req.on("error", reject);
	});
}

function nodeMiddleware(RED: NodeAPI): RequestHandler[] {
	const middleware: unknown = (RED.settings as {httpNodeMiddleware?: unknown}).httpNodeMiddleware;
	if (typeof middleware === "function") {
		return [middleware as RequestHandler];
	}
	return Array.isArray(middleware) ? middleware as RequestHandler[] : [];
}

function routerOf(RED: NodeAPI): RouterWithStack | undefined {
	const app = RED.httpNode as unknown as {_router?: RouterWithStack; router?: RouterWithStack};
	return app._router ?? app.router;
}

export function addWebhookRoute(
	RED: NodeAPI,
	path: string,
	webhookUrlToken: string | undefined,
	onWebhook: (body: GreenApiWebhook) => void,
): () => void {
	const handler = async (req: Request, res: Response, next: NextFunction) => {
		try {
			if (webhookUrlToken && !tokensMatch(webhookUrlToken, req.headers.authorization)) {
				res.sendStatus(401);
				return;
			}
			const body = await readJsonBody(req);
			if (!body || typeof body !== "object" || !("typeWebhook" in body)) {
				res.sendStatus(400);
				return;
			}
			onWebhook(body as GreenApiWebhook);
			res.sendStatus(200);
		} catch (error) {
			next(error);
		}
	};
	RED.httpNode.post(path, ...nodeMiddleware(RED), handler);

	return () => {
		const router = routerOf(RED);
		if (!router) {
			return;
		}
		for (let index = router.stack.length - 1; index >= 0; index--) {
			const route = router.stack[index].route;
			if (route && route.path === path && route.methods.post) {
				router.stack.splice(index, 1);
			}
		}
	};
}
