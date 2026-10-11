import './contracts';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { ShardCoordinator, ShardManager } from 'kairojs/sharding';
import { formatStats } from './stats';

const folder = mkdtempSync(join(tmpdir(), 'kairo-example-'));
if (!resolve(folder).startsWith(resolve(tmpdir()) + sep)) throw new Error('Unexpected temporary path.');
const managers: ShardManager[] = [];
// Disposable loopback-only secret. Nothing here contacts Discord.
const token = crypto.randomUUID() + crypto.randomUUID();
const coordinator = new ShardCoordinator({
	shardCount: 2,
	port: 0,
	statePath: join(folder, 'state.sqlite'),
	workers: [{ id: 'local', token, shards: [0, 1] }],
	sessionStartLimit: { total: 10, remaining: 10, reset_after: 60000, max_concurrency: 1 }
});

try {
	await coordinator.start();
	const manager = new ShardManager({
		id: 'local',
		token,
		url: coordinator.url!,
		script: new URL('./bot.ts', import.meta.url),
		args: ['--offline'],
		env: { DEV_GUILD_ID: '', DISCORD_TOKEN: undefined },
		restart: false
	});
	managers.push(manager);
	await manager.start();
	const deadline = performance.now() + 15000;
	while (coordinator.workers[0].shards.length !== 2) {
		if (performance.now() >= deadline) throw new Error('Example shards did not start. Check the child process logs.');
		await Bun.sleep(25);
	}
	const results = await manager.broadcast('exampleStats', null, { timeoutMs: 5000 });
	for (const result of results) {
		if (!result.ok) throw result.error;
		if (result.value.commands.join(',') !== 'ping,shard,stats') throw new Error(`Shard ${result.shard} did not load all three commands.`);
	}
	const shard = await manager.request(1, 'exampleStats', null);
	if (shard.shard !== 1) throw new Error('The single-shard request reached the wrong shard.');
	console.log(formatStats(results));
	console.log('Offline check passed: two bot processes, command loading, broadcast and single-shard requests.');
} finally {
	try {
		await Promise.all(managers.map((manager) => manager.close()));
	} finally {
		await coordinator.close();
		rmSync(folder, { recursive: true, force: true });
	}
}
