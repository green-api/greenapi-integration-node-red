import type { GreenApiClient } from "@green-api/greenapi-integration";
import type { NotificationListener } from "./types";

export type NotificationQueueClient = Pick<GreenApiClient, "receiveNotification" | "deleteNotification">;

export interface PollerOptions {
	receiveTimeoutSeconds: number;
	retryDelayMs: number;
}

export class NotificationPoller {
	private readonly listeners = new Set<NotificationListener>();
	private generation = 0;
	private running = false;
	private failing = false;
	private current: Promise<void> = Promise.resolve();

	constructor(private readonly client: NotificationQueueClient, private readonly options: PollerOptions) {}

	get isRunning(): boolean {
		return this.running;
	}

	subscribe(listener: NotificationListener): void {
		this.listeners.add(listener);
		if (!this.running) {
			this.start();
		}
	}

	unsubscribe(listener: NotificationListener): void {
		this.listeners.delete(listener);
		if (this.listeners.size === 0) {
			this.stop();
		}
	}

	stop(): void {
		this.running = false;
		this.generation++;
	}

	private start(): void {
		this.running = true;
		this.failing = false;
		const generation = ++this.generation;
		this.current = this.current.catch(() => undefined).then(() => this.loop(generation));
	}

	private isCurrent(generation: number): boolean {
		return this.running && generation === this.generation;
	}

	private async loop(generation: number): Promise<void> {
		while (this.isCurrent(generation)) {
			try {
				const notification = await this.client.receiveNotification(this.options.receiveTimeoutSeconds);
				if (!this.isCurrent(generation)) {
					return;
				}
				if (this.failing) {
					this.failing = false;
					this.listeners.forEach(listener => listener.onPollRecovered());
				}
				if (!notification) {
					continue;
				}
				this.listeners.forEach(listener => listener.onNotification(notification.body));
				await this.client.deleteNotification(notification.receiptId);
			} catch (error) {
				if (!this.isCurrent(generation)) {
					return;
				}
				this.failing = true;
				const failure = error instanceof Error ? error : new Error(String(error));
				this.listeners.forEach(listener => listener.onPollError(failure));
				await new Promise(resolve => setTimeout(resolve, this.options.retryDelayMs));
			}
		}
	}
}
