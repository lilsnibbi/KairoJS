import type { ShardResult } from 'kairojs/sharding';
import type { ExampleShardStats } from './contracts';

export function formatStats(results: ShardResult<ExampleShardStats>[]): string {
	let guilds = 0;
	let responding = 0;
	for (const result of results) {
		if (result.ok) {
			guilds += result.value.guilds;
			responding++;
		}
	}
	const lines = results.slice(0, 10).map((result) => {
		if (!result.ok) return `Shard ${result.shard}: unavailable (${result.error.code})`;
		const stats = result.value;
		return `Shard ${stats.shard}: ${stats.ready ? 'ready' : 'not logged in'}, ${stats.guilds} servers, ${stats.memoryMb} MB, up ${stats.uptimeSeconds}s`;
	});
	if (results.length > 10) lines.push(`...plus ${results.length - 10} more shards.`);
	return [`${responding}/${results.length} shards responded; ${guilds} servers on responding shards.`, '', ...lines].join('\n');
}
