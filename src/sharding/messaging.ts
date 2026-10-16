import { statsMap, statsRequest, statsSnapshot } from "./stats";
import {
	type ShardCallOptions,
	ShardError,
	type ShardInput,
	type ShardOutput,
	type ShardRequestName,
	type ShardResult,
	type ShardStatsResult,
} from "./types";

/** Named request API shared by client.sharding and the host supervisor. */
export abstract class ShardMessenger {
	public abstract get shardCount(): number;
	protected async prepare(
		options: ShardCallOptions,
	): Promise<ShardCallOptions> {
		return options;
	}
	protected abstract call(
		target: number,
		name: string,
		payload: unknown,
		options: ShardCallOptions,
	): Promise<unknown>;
	/** Ask one shard to run a registered handler. Even self requests travel through the coordinator. */
	public request<K extends ShardRequestName>(
		shard: number,
		name: K,
		payload: ShardInput<K>,
		options: ShardCallOptions = {},
	): Promise<ShardOutput<K>> {
		return this.call(shard, name, payload, options) as Promise<ShardOutput<K>>;
	}
	/**
	 * Ask for fresh stats from one shard, or every ID in the current assignment's shard count.
	 * Always returns the same read-only map shape. Entries, samples, memory and errors are frozen copies.
	 * Each call goes through the coordinator, including self; cached scaling metrics are never used.
	 * One timeoutMs budget covers waiting and collection (limits.timeoutMs by default), with at most eight requests at once.
	 * Failed entries have ok: false and an error such as UNAVAILABLE, TIMEOUT or CAPACITY, with no metrics.
	 * Invalid arguments or failure to prepare the local coordinator connection reject the promise.
	 * After collection starts, disconnects and cancellation become per-shard errors; sent requests are never replayed.
	 */
	public async stats(
		shardId?: number,
		options: ShardCallOptions = {},
	): Promise<ReadonlyMap<number, ShardStatsResult>> {
		options = await this.prepare(options);
		if (!this.shardCount)
			throw new ShardError("DISCONNECTED", "Sharding is not connected.");
		if (
			shardId !== undefined &&
			(!Number.isInteger(shardId) || shardId < 0 || shardId >= this.shardCount)
		)
			throw new ShardError("TARGET", "Shard is outside the configured range.");
		const targets =
			shardId === undefined
				? Array.from({ length: this.shardCount }, (_, shard) => shard)
				: [shardId];
		const deadline = performance.now() + (options.timeoutMs ?? 15000);
		const results: ShardStatsResult[] = new Array(targets.length);
		let next = 0;
		await Promise.all(
			Array.from({ length: Math.min(8, targets.length) }, async () => {
				while (next < targets.length) {
					const index = next++;
					const shard = targets[index];
					try {
						if (options.signal?.aborted)
							throw new ShardError("ABORTED", "Shard stats request aborted.");
						const remaining = Math.floor(deadline - performance.now());
						if (remaining <= 0)
							throw new ShardError("TIMEOUT", "Shard stats deadline elapsed.");
						const value = await this.call(shard, statsRequest, null, {
							...options,
							timeoutMs: remaining,
						});
						if (performance.now() >= deadline)
							throw new ShardError("TIMEOUT", "Shard stats deadline elapsed.");
						results[index] = Object.freeze({
							shard,
							ok: true,
							value: statsSnapshot(value),
						});
					} catch (cause) {
						const error = options.signal?.aborted
							? new ShardError("ABORTED", "Shard stats request aborted.")
							: cause instanceof ShardError
								? new ShardError(cause.code, cause.message)
								: new ShardError(
										"REQUEST",
										cause instanceof Error
											? cause.message
											: "Shard stats request failed.",
									);
						results[index] = Object.freeze({
							shard,
							ok: false,
							error: Object.freeze(error),
						});
					}
				}
			}),
		);
		return statsMap(results);
	}
	/** Every configured shard, including self. Missing/failed shards have explicit error entries. */
	public async broadcast<K extends ShardRequestName>(
		name: K,
		payload: ShardInput<K>,
		options: ShardCallOptions = {},
	): Promise<ShardResult<ShardOutput<K>>[]> {
		options = await this.prepare(options);
		if (!this.shardCount)
			throw new ShardError("DISCONNECTED", "Sharding is not connected.");
		const deadline = performance.now() + (options.timeoutMs ?? 15000);
		const results: ShardResult<ShardOutput<K>>[] = new Array(this.shardCount);
		let next = 0;
		await Promise.all(
			Array.from({ length: Math.min(8, this.shardCount) }, async () => {
				while (next < results.length) {
					const shard = next++;
					try {
						const remaining = Math.floor(deadline - performance.now());
						if (remaining <= 0)
							throw new ShardError("TIMEOUT", "Broadcast deadline elapsed.");
						results[shard] = {
							shard,
							ok: true,
							value: await this.request(shard, name, payload, {
								...options,
								timeoutMs: remaining,
							}),
						};
					} catch (error) {
						results[shard] = {
							shard,
							ok: false,
							error:
								error instanceof ShardError
									? error
									: new ShardError(
											"REQUEST",
											error instanceof Error
												? error.message
												: "Request failed.",
										),
						};
					}
				}
			}),
		);
		return results;
	}
}
