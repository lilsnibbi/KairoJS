import { type ShardCallOptions, ShardError, type ShardInput, type ShardOutput, type ShardRequestName, type ShardResult } from './types';

/** Named request API shared by client.sharding and the host supervisor. */
export abstract class ShardMessenger {
	public abstract get shardCount(): number;
	protected abstract call(target: number, name: string, payload: unknown, options: ShardCallOptions): Promise<unknown>;
	public request<K extends ShardRequestName>(
		shard: number,
		name: K,
		payload: ShardInput<K>,
		options: ShardCallOptions = {}
	): Promise<ShardOutput<K>> {
		return this.call(shard, name, payload, options) as Promise<ShardOutput<K>>;
	}
	/** Every configured shard, including self. Missing/failed shards have explicit error entries. */
	public async broadcast<K extends ShardRequestName>(
		name: K,
		payload: ShardInput<K>,
		options: ShardCallOptions = {}
	): Promise<ShardResult<ShardOutput<K>>[]> {
		if (!this.shardCount) throw new ShardError('DISCONNECTED', 'Sharding is not connected.');
		const results: ShardResult<ShardOutput<K>>[] = new Array(this.shardCount);
		let next = 0;
		await Promise.all(
			Array.from({ length: Math.min(8, this.shardCount) }, async () => {
				while (next < results.length) {
					const shard = next++;
					try {
						results[shard] = { shard, ok: true, value: await this.request(shard, name, payload, options) };
					} catch (error) {
						results[shard] = {
							shard,
							ok: false,
							error:
								error instanceof ShardError ? error : new ShardError('REQUEST', error instanceof Error ? error.message : 'Request failed.')
						};
					}
				}
			})
		);
		return results;
	}
}
