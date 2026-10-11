import { cpus } from 'node:os';
import type { APIGuildMember, GuildMemberFlags } from 'discord-api-types/v10';
import { GatewayDispatchEvents } from 'discord-api-types/v10';
import { MockDiscord } from '../examples/engine/MockDiscord';
import { EngineCache } from '../src/engine/cache/EngineCache';

const guildCount = 100;
const limit = 1000;
const insertedPerGuild = 1100;
function member(id: string): APIGuildMember {
	return {
		user: { id, username: `member-${id}`, discriminator: '0', global_name: 'Synthetic Member', avatar: null },
		nick: 'A representative nickname',
		roles: ['100000000000000010', '100000000000000011', '100000000000000012'],
		joined_at: '2026-01-01T00:00:00.000Z',
		premium_since: null,
		pending: false,
		communication_disabled_until: null,
		deaf: false,
		mute: false,
		flags: 0 as GuildMemberFlags
	};
}
function id(value: number): string {
	return String(100000000000000000n + BigInt(value));
}
const cache = new EngineCache();
for (let i = 0; i < 10_000; i++) cache.putMember('warmup', id(i), member(id(i)));
cache.clear();
Bun.gc(true);
const before = process.memoryUsage();
const started = performance.now();
for (let guild = 0; guild < guildCount; guild++)
	for (let index = 0; index < insertedPerGuild; index++) cache.putMember(id(guild), id(index), member(id(index)));
const insertMs = performance.now() - started;
Bun.gc(true);
const after = process.memoryUsage();
const retained = [...cache.members.scopeIds()].reduce((sum, guild) => sum + cache.members.size(guild), 0);
if (retained !== guildCount * limit) throw new Error('Benchmark residency invariant failed.');
let sink = 0;
function measure(operation: () => void): { medianMs: number; samplesMs: number[] } {
	operation();
	const samples = Array.from({ length: 5 }, () => {
		const start = performance.now();
		operation();
		return Number((performance.now() - start).toFixed(3));
	});
	return { medianMs: [...samples].sort((a, b) => a - b)[2] ?? 0, samplesMs: samples };
}
const targetedGet = measure(() => {
	for (let index = 0; index < 100_000; index++)
		if (cache.members.get(id(index % guildCount), id(100 + (Math.floor(index / guildCount) % limit)))) sink++;
});
const iteration = measure(() => {
	for (const guild of cache.members.scopeIds()) for (const entry of cache.members.values(guild)) sink += entry.data.roles?.length ?? 0;
});
const merge = measure(() => {
	for (let index = 0; index < 100_000; index++)
		cache.patchMember(id(index % guildCount), id(100 + (Math.floor(index / guildCount) % limit)), { nick: index % 2 ? null : 'Updated' });
});
const activityMessage = MockDiscord.message();
const gatewayActivity = measure(() => {
	for (let index = 0; index < 10_000; index++)
		cache.apply({
			op: 0,
			t: GatewayDispatchEvents.MessageCreate,
			s: index + 1,
			d: {
				...activityMessage,
				id: id(index + 5000),
				guild_id: id(index % guildCount),
				author: { ...activityMessage.author, id: id(100 + (Math.floor(index / guildCount) % limit)) },
				member: { deaf: false, mute: false, roles: [], joined_at: '2026-01-01T00:00:00.000Z', flags: 0 as GuildMemberFlags }
			}
		});
});
console.log(
	JSON.stringify(
		{
			measuredAt: new Date().toISOString(),
			runtime: `Bun ${Bun.version}`,
			platform: process.platform,
			architecture: process.arch,
			cpu: cpus()[0]?.model,
			kind: 'Synthetic in-process microbenchmark, not Discord/network or cross-library performance',
			workload: {
				guildCount,
				membersPerGuild: limit,
				insertedPerGuild,
				retained,
				messageCache: false,
				access: 'One visit to each resident guild/member pair per 100000-operation pass'
			},
			memory: {
				beforeGCSettled: before,
				afterGCSettled: after,
				heapUsedDeltaBytes: after.heapUsed - before.heapUsed,
				rssDeltaBytes: after.rss - before.rss,
				approximateHeapBytesPerRetainedMember: (after.heapUsed - before.heapUsed) / retained
			},
			insert110000Ms: Number(insertMs.toFixed(3)),
			targetedGet100000: targetedGet,
			iterate100000: iteration,
			partialMerge100000: merge,
			gatewayMessageActivity10000: gatewayActivity,
			sink,
			caveats: [
				'One synthetic workload on one machine; five timed samples after warmup.',
				'Repeated timestamps, role IDs and strings may be shared by the runtime.',
				'Heap/RSS deltas include allocator and JIT behavior; approximate per-member value is not an object size.',
				'No network, compression, live guild traffic, user handlers or comparison library included.'
			]
		},
		null,
		2
	)
);
