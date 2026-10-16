import type { LoggerLike } from "../core/logging/LoggerLike";

/** Augment through kairojs with named { input, output } contracts. Values must be JSON. */
export interface ShardRequests {}
export type ShardRequestName = keyof ShardRequests & string;
export type ShardInput<K extends ShardRequestName> = ShardRequests[K] extends {
	input: infer I;
}
	? I
	: never;
export type ShardOutput<K extends ShardRequestName> = ShardRequests[K] extends {
	output: infer O;
}
	? O
	: never;
export interface ShardCallOptions {
	/** Whole operation budget in milliseconds, including an optional coordinator wait. Defaults to limits.timeoutMs. */
	timeoutMs?: number;
	/** Stop waiting for a reply. Already running handlers should also watch their context signal. */
	signal?: AbortSignal;
	/** Wait for local coordinator reconciliation within timeoutMs. Default false; sent calls are never replayed. */
	waitForCoordinator?: boolean;
}
export interface ShardContext {
	readonly source: number | null;
	readonly signal: AbortSignal;
}
export type ShardResult<T> =
	| { shard: number; ok: true; value: T }
	| { shard: number; ok: false; error: ShardError };
/** A fresh sample taken inside one shard process when it receives your stats request. */
export interface ShardStats {
	/** Unix milliseconds on the shard's clock. Samples from different machines aren't an atomic snapshot. */
	readonly sampledAt: number;
	/** Whether this shard's Discord client is ready at sampling time. */
	readonly ready: boolean;
	/** Current local cache sizes, not Discord-wide totals. Users can appear in more than one shard's cache. */
	readonly guilds: number;
	readonly users: number;
	readonly channels: number;
	/** Latest gateway heartbeat latency in milliseconds, or null before a measurement is available. */
	readonly pingMs: number | null;
	/** Milliseconds since the client last became ready, or null while it isn't ready. */
	readonly uptimeMs: number | null;
	/** OS process ID on this shard's host. PIDs aren't unique across hosts. */
	readonly pid: number;
	/** Milliseconds since this Bun process started, independent of Discord reconnects. */
	readonly processUptimeMs: number;
	/** Process memory in bytes. These fields overlap; don't add them together. */
	readonly memory: {
		readonly rss: number;
		readonly heapTotal: number;
		readonly heapUsed: number;
		readonly external: number;
		readonly arrayBuffers: number;
	};
}
/** Check ok before reading value. Failed shards have an error and no substitute metrics. */
export type ShardStatsResult =
	| { readonly shard: number; readonly ok: true; readonly value: ShardStats }
	| {
			readonly shard: number;
			readonly ok: false;
			readonly error: Readonly<ShardError>;
	  };
export class ShardError extends Error {
	public constructor(
		public readonly code: string,
		message: string,
	) {
		super(message);
		this.name = "ShardError";
	}
}
export interface ShardLimits {
	/** Maximum encoded message size, default 64 KiB. */
	maxBytes?: number;
	/** In-flight operations, default 256. Also bounds running handlers. */
	maxPending?: number;
	/** Outgoing WebSocket buffer, default 256 KiB. */
	maxBufferedBytes?: number;
	/** Ordinary request deadline, default 15 seconds. */
	timeoutMs?: number;
}
export interface ShardSessionLimit {
	total: number;
	remaining: number;
	reset_after: number;
	max_concurrency: number;
}
export interface ShardHost {
	id: string;
	token: string;
	/** Initial placement preferences. Actual ownership is leased per process. */
	shards: readonly number[];
	/** Capacity for new allocations; returning valid IDs are retained. Required with automatic scaling. */
	maxShards?: number;
	/** Relative host resource weight for allocation, default 1. */
	weight?: number;
}
export interface ShardScalingOptions {
	/** Upper deployment bound, required. No machines are provisioned. */
	maxShards: number;
	minShards?: number;
	/** Optional average guild target. Counts are rounded to a multiple of Discord's recommendation. */
	targetGuildsPerShard?: number;
	/** Metadata polling interval, at least 60 seconds; default 5 minutes. */
	pollIntervalMs?: number;
	/** Minimum interval between changes, at least 60 seconds; default 30 minutes. */
	cooldownMs?: number;
	/** Consecutive matching decisions before changing topology, default 3. */
	confirmations?: number;
	allowDownscale?: boolean;
	/** Required reduction in peak weighted host load for an allocation-only change, default 0.25. */
	rebalanceThreshold?: number;
	/** Retain this many unused session starts beyond the proposed deployment, default 0. */
	sessionReserve?: number;
	drainTimeoutMs?: number;
	readyTimeoutMs?: number;
}
export interface ShardScalingStatus {
	phase: "disabled" | "idle" | "draining" | "starting" | "degraded";
	shardCount: number;
	targetShards?: number;
	reason?: string;
}
export interface ShardCoordinatorOptions {
	shardCount: number;
	/** Configured supervisor hosts and assignments, not JavaScript Worker threads. */
	workers: readonly ShardHost[];
	/** Opt-in automatic recommendations and capacity-aware allocation; requires botToken. */
	scaling?: ShardScalingOptions;
	hostname?: string;
	port?: number;
	tls?: Bun.TLSOptions;
	/** Explicitly enables GET /gateway/bot at startup and session reset. Never sent to hosts. */
	botToken?: string;
	/** Offline/manual alternative. Supply fresh metadata on every start; expires without automatic refill. */
	sessionStartLimit?: ShardSessionLimit;
	limits?: ShardLimits;
	logger?: LoggerLike;
}
export interface ShardRecovery {
	/** Consecutive restarts before stopping the shard, default 5. */
	maxRestarts?: number;
	initialDelayMs?: number;
	maxDelayMs?: number;
	/** Reset the crash count only after this much uninterrupted uptime, default 60 seconds. */
	stableAfterMs?: number;
}
export interface ShardManagerOptions {
	id: string;
	url: string;
	token: string;
	/** Local .ts entrypoint, one Bun child per assigned Discord shard. */
	script: string | URL;
	cwd?: string;
	args?: readonly string[];
	env?: Record<string, string | undefined>;
	restart?: false | ShardRecovery;
	/** Initial connection/admission waits and later reconnection are independent of child restart; default enabled without an attempt limit. */
	reconnect?: false | { initialDelayMs?: number; maxDelayMs?: number };
	/** Each coordinator handshake or application boot attempt. */
	startupTimeoutMs?: number;
	shutdownTimeoutMs?: number;
	/** Each attempt, including queueing and re-identification; default 120 seconds. */
	identifyTimeoutMs?: number;
	/** Dormant assignment polling, default 30 seconds (50..300000ms). */
	assignmentPollIntervalMs?: number;
	/** Maximum unreconciled lifetime of an assigned process, default 15 minutes (1..2147483647ms). */
	maxDisconnectedLifetimeMs?: number;
	/** Optional minimum local process pool, including standby capacity. Must fit the host's configured maxShards. */
	processCount?: number;
	logger?: LoggerLike;
}
export interface ShardProcessStatus {
	/** Stable local process slot; independent of the leased Discord shard ID. */
	slot: number;
	shard: number | null;
	state:
		| "starting"
		| "running"
		| "maintenance"
		| "dormant"
		| "backoff"
		| "failed"
		| "stopped";
	pid: number | null;
	restarts: number;
}
