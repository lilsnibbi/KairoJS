import type {
	APIChannel,
	APIGuildMember,
	APIMessage,
} from "discord-api-types/v10";
import { GatewayDispatchEvents as E } from "discord-api-types/v10";
import { fallbackLogger } from "../../core/logging/console";
import { writeEvent } from "../../core/logging/diagnostics";
import { EngineCache } from "../cache/EngineCache";
import { systemClock } from "../common";
import type { $GatewayState } from "../gateway/GatewayShard";
import { GatewayShard } from "../gateway/GatewayShard";
import { IdentifyGate } from "../gateway/IdentifyGate";
import type { $GatewayDispatch } from "../gateway/types";
import { RestClient } from "../rest/RestClient";
import { EngineInteraction } from "./EngineInteraction";
import { EngineMessage } from "./EngineMessage";
import { EventHub } from "./EventHub";
import type { $EngineEvents, $EngineFailure, $EngineOptions } from "./types";

/** Independent Bun engine. Construction opens no network connection. */
export class EngineClient {
	public readonly cache: EngineCache;
	public readonly rest: RestClient;
	private readonly events: EventHub<$EngineEvents>;
	private gateway?: GatewayShard;
	private connection?: Promise<void>;
	private closed = false;
	private revision = 0;
	private reporting = false;
	readonly #options: $EngineOptions;

	public constructor(options: $EngineOptions) {
		this.#options = {
			...options,
			gateway: { ...options.gateway },
			rest: { ...options.rest },
		};
		this.cache = new EngineCache(options.cache);
		this.rest = new RestClient(options.token, {
			clock: options.clock,
			...options.rest,
		});
		this.events = new EventHub(
			options.maxPendingHandlers ?? 1024,
			(error, fatal) => {
				this.report({ source: "handler", error, fatal });
				if (fatal) this.close();
			},
		);
	}
	public get state(): $GatewayState {
		return this.closed ? "closed" : (this.gateway?.state ?? "idle");
	}
	public get pendingHandlers(): number {
		return this.events.pendingCount;
	}
	public on<K extends keyof $EngineEvents>(
		name: K,
		listener: (event: $EngineEvents[K]) => void | Promise<void>,
	): () => void {
		return this.events.on(name, listener);
	}
	public connect(): Promise<void> {
		if (this.closed)
			return Promise.reject(new Error("Engine client is closed."));
		this.connection ??= this.open().catch((error: unknown) => {
			this.close();
			throw error;
		});
		return this.connection;
	}
	private async open(): Promise<void> {
		const info = await this.rest.getGatewayBot();
		if (this.closed)
			throw new Error("Engine client closed while discovering gateway.");
		const clock = this.#options.clock ?? systemClock;
		const gate = new IdentifyGate(clock, info.session_start_limit);
		if (info.shards > 1 && !this.#options.gateway?.shard)
			throw new Error(
				"Discord recommends multiple shards. Supply a shard tuple and coordinated identify permits.",
			);
		const shardId = this.#options.gateway?.shard?.[0] ?? 0;
		this.gateway = new GatewayShard(
			{
				...this.#options.gateway,
				token: this.#options.token,
				intents: this.#options.intents,
				url: this.#options.gateway?.url ?? info.url,
				clock,
				identify: async (signal) => {
					await this.#options.waitForIdentify?.(shardId, signal);
					await gate.acquire(signal);
				},
			},
			{
				dispatch: (payload) => this.dispatch(payload),
				reset: () => {
					++this.revision;
					this.cache.clear();
				},
				state: (state) => this.events.emit("gatewayState", state),
				failure: (error, fatal) => {
					this.report({ source: "gateway", error, fatal });
					if (fatal) this.close();
				},
			},
		);
		await this.gateway.start();
	}
	private dispatch(payload: $GatewayDispatch): void {
		if (this.closed) return;
		++this.revision;
		const deletions = this.cache.apply(payload);
		for (const deletion of deletions) this.events.emit("cacheDelete", deletion);
		switch (payload.t) {
			case E.Ready:
				this.events.emit("ready", payload.d);
				break;
			case E.Resumed:
				this.events.emit("resumed", payload.d);
				break;
			case E.MessageCreate: {
				const entry = this.cache.messages.peek(
					payload.d.channel_id,
					payload.d.id,
				);
				const message = entry?.complete ? entry.data : payload.d;
				this.events.emit(
					"messageCreate",
					new EngineMessage(message, this.rest),
				);
				break;
			}
			case E.MessageUpdate:
				this.events.emit("messageUpdate", {
					payload: payload.d,
					cached: this.cache.messages.peek(payload.d.channel_id, payload.d.id),
				});
				break;
			case E.InteractionCreate:
				this.events.emit(
					"interactionCreate",
					new EngineInteraction(payload.d, this.rest),
				);
				break;
		}
		this.events.emit("dispatch", payload);
	}
	/** Explicit HTTP read. A concurrent gateway dispatch prevents stale cache writeback. */
	public async fetchMember(
		guildId: string,
		userId: string,
	): Promise<APIGuildMember> {
		const version = this.revision;
		const member = await this.rest.getMember(guildId, userId);
		if (!this.closed && version === this.revision) {
			this.cache.putMember(guildId, userId, member);
			const cached = this.cache.members.peek(guildId, userId);
			if (cached?.complete) return cached.data;
		}
		return member;
	}
	public async fetchChannel(channelId: string): Promise<APIChannel> {
		const version = this.revision;
		const channel = await this.rest.getChannel(channelId);
		if (!this.closed && version === this.revision) {
			this.cache.putChannel(channel);
			const cached = this.cache.channels.peek(channelId);
			if (cached?.complete) return cached.data;
		}
		return channel;
	}
	public async fetchMessage(
		channelId: string,
		messageId: string,
	): Promise<APIMessage> {
		const version = this.revision;
		const message = await this.rest.getMessage(channelId, messageId);
		if (!this.closed && version === this.revision) {
			this.cache.putMessage(message);
			const cached = this.cache.messages.peek(channelId, messageId);
			if (cached?.complete) return cached.data;
		}
		return message;
	}
	public idle(): Promise<void> {
		return this.events.idle();
	}
	public close(): void {
		if (this.closed) return;
		this.closed = true;
		++this.revision;
		this.gateway?.stop();
		this.rest.close();
		this.cache.clear();
		this.events.close();
	}
	private report(failure: $EngineFailure): void {
		if (this.reporting) return;
		this.reporting = true;
		try {
			if (this.#options.onError) this.#options.onError(failure);
			else
				writeEvent(fallbackLogger(), "error", {
					component: `engine.${failure.source}`,
					event: "operation_failed",
					message:
						failure.source === "gateway"
							? failure.fatal
								? "Gateway session cannot continue; the engine connection is closing."
								: "Gateway connection interrupted; inspect transport diagnostics while recovery proceeds."
							: failure.source === "handler"
								? failure.fatal
									? "Pending event handlers exceeded capacity; closing the engine to bound unfinished work."
									: "An event handler failed; other handlers can continue. Inspect the failing callback."
								: "Engine client operation failed; inspect its lifecycle state and diagnostic cause.",
					error: failure.error,
					context: {
						fatal: failure.fatal,
						shard: this.#options.gateway?.shard?.[0] ?? 0,
						state: this.state,
						pendingHandlers: this.pendingHandlers,
					},
				});
		} catch (error) {
			writeEvent(fallbackLogger(), "error", {
				component: "engine.client",
				event: "error_callback_failed",
				message:
					"Engine onError callback threw while reporting a failure; inspect the callback itself.",
				error,
			});
		} finally {
			this.reporting = false;
		}
	}
}
