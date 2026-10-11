import type { LoggerLike } from '../core/logging/LoggerLike';

/** Augment through kairojs with named { input, output } contracts. Values must be JSON. */
export interface ShardRequests {}
export type ShardRequestName = keyof ShardRequests & string;
export type ShardInput<K extends ShardRequestName> = ShardRequests[K] extends { input: infer I } ? I : never;
export type ShardOutput<K extends ShardRequestName> = ShardRequests[K] extends { output: infer O } ? O : never;
export interface ShardCallOptions {
	timeoutMs?: number;
	signal?: AbortSignal;
}
export interface ShardContext {
	readonly source: number | null;
	readonly signal: AbortSignal;
}
export type ShardResult<T> = { shard: number; ok: true; value: T } | { shard: number; ok: false; error: ShardError };
export class ShardError extends Error {
	public constructor(
		public readonly code: string,
		message: string
	) {
		super(message);
		this.name = 'ShardError';
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
	shards: readonly number[];
}
export interface ShardCoordinatorOptions {
	shardCount: number;
	workers: readonly ShardHost[];
	/** Dedicated SQLite file; retain it across coordinator restarts. */
	statePath: string;
	hostname?: string;
	port?: number;
	tls?: Bun.TLSOptions;
	/** Explicitly enables GET /gateway/bot at startup and session reset. Never sent to hosts. */
	botToken?: string;
	/** Offline/manual alternative. Expires once; call updateSessionLimit with fresh metadata. */
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
	/** Network reconnection is independent of child restart, default enabled. */
	reconnect?: false | { initialDelayMs?: number; maxDelayMs?: number };
	startupTimeoutMs?: number;
	shutdownTimeoutMs?: number;
	/** Each attempt, including queueing and re-identification; default 120 seconds. */
	identifyTimeoutMs?: number;
	logger?: LoggerLike;
}
export interface ShardProcessStatus {
	shard: number;
	state: 'starting' | 'running' | 'backoff' | 'failed' | 'stopped';
	pid: number | null;
	restarts: number;
}
