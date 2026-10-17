import { type Client, WebSocketManager } from "discord.js";
import { ShardError } from "../types";

/** discord.js 14 adapter: retire its whole gateway manager to discard cached shard count/session resume data.
 * Keep the VirelloClient, modules, REST client and application listeners alive across dormant assignments.
 * The exported WebSocketManager's lifecycle methods are private in its TypeScript declarations.
 */
export class ManagedGateway {
	private assignment?: { shard: number | null; count: number };
	private revision = 0;
	private onlineRevision = -1;
	private token?: string;
	private closed = false;
	private running?: Promise<string>;
	private attempt?: Promise<unknown>;
	public constructor(
		private readonly client: Client,
		private readonly waitForAssignment: () => Promise<void>,
		private readonly fail: (error: unknown) => void,
	) {}
	public async reconcile(shard: number | null, count: number): Promise<void> {
		if (
			this.closed ||
			(this.assignment?.shard === shard && this.assignment.count === count)
		)
			return;
		this.revision++;
		if (!this.attempt && this.onlineRevision === -1) {
			this.client.options.shards = shard === null ? [] : [shard];
			this.client.options.shardCount = count;
			this.assignment = { shard, count };
			return;
		}
		const retiring = this.client.ws;
		await Reflect.get(retiring, "destroy").call(retiring);
		await this.attempt?.catch(() => {});
		// A pending gateway metadata fetch can finish after the outer manager was destroyed.
		// Retire the underlying strategy again after that attempt settles, before opening a replacement.
		const transport = Reflect.get(retiring, "_ws");
		if (transport) await transport.destroy();
		if (this.closed) return;
		this.client.guilds.cache.clear();
		this.client.channels.cache.clear();
		this.client.users.cache.clear();
		this.client.readyTimestamp = null;
		this.client.options.shards = shard === null ? [] : [shard];
		this.client.options.shardCount = count;
		this.client.ws = Reflect.construct(WebSocketManager, [
			this.client,
		]) as WebSocketManager;
		this.assignment = { shard, count };
	}
	public start(token?: string): Promise<string> {
		const value = token ?? this.client.token;
		if (!value || typeof value !== "string")
			return Promise.reject(
				new ShardError("CONFIG", "A Discord bot token is required."),
			);
		this.token = value.replace(/^(Bot|Bearer)\s*/i, "");
		this.client.token = this.token;
		this.client.rest.setToken(this.token);
		if (this.client.options.presence) {
			this.client.options.ws ??= {};
			const presence = Reflect.get(this.client, "presence");
			Reflect.set(
				this.client.options.ws,
				"presence",
				Reflect.get(presence, "_parse").call(
					presence,
					this.client.options.presence,
				),
			);
		}
		return this.connect();
	}
	public resume(): void {
		if (this.token && !this.closed) void this.connect().catch(this.fail);
	}
	public stop(): void {
		this.closed = true;
		this.revision++;
	}
	private connect(): Promise<string> {
		return (this.running ??= this.open().finally(() => {
			this.running = undefined;
		}));
	}
	private async open(): Promise<string> {
		while (!this.closed) {
			await this.waitForAssignment();
			if (this.closed) break;
			if (this.onlineRevision === this.revision) return this.token!;
			const revision = this.revision;
			const gateway = this.client.ws;
			const attempt = Promise.resolve(
				Reflect.get(gateway, "connect").call(gateway),
			);
			this.attempt = attempt;
			try {
				await attempt;
				if (revision === this.revision && !this.closed) {
					this.onlineRevision = revision;
					return this.token!;
				}
			} catch (error) {
				if (revision === this.revision && !this.closed) throw error;
			} finally {
				if (this.attempt === attempt) this.attempt = undefined;
			}
		}
		throw new ShardError("CLOSED", "Managed gateway is closed.");
	}
}
