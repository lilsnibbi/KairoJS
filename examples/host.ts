import { ShardManager } from 'kairojs/sharding';
import { requiredEnv } from './config';
import { onShutdown } from './shutdown';

const id = Bun.env.SHARD_HOST_ID?.trim() || 'local';
const manager = new ShardManager({
	id,
	token: requiredEnv('SHARD_HOST_TOKEN'),
	url: Bun.env.SHARD_COORDINATOR_URL?.trim() || 'ws://127.0.0.1:8080/sharding',
	script: new URL('./bot.ts', import.meta.url),
	cwd: import.meta.dir,
	env: { DISCORD_TOKEN: requiredEnv('DISCORD_TOKEN') }
});

onShutdown(() => manager.close());
try {
	await manager.start();
	console.log(`Host ${id} connected. Its assigned bot processes are starting; watch for each shard's ready message.`);
} catch (error) {
	await manager.close();
	throw error;
}
