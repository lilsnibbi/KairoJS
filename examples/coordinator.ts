import { ShardCoordinator } from 'kairojs/sharding';
import { integerEnv, requiredEnv, workerAssignments } from './config';
import { onShutdown } from './shutdown';

const shardCount = integerEnv('SHARD_COUNT', 2, 1, 4096);
const cert = Bun.env.SHARD_TLS_CERT?.trim();
const key = Bun.env.SHARD_TLS_KEY?.trim();
if (Boolean(cert) !== Boolean(key)) throw new Error('Set both SHARD_TLS_CERT and SHARD_TLS_KEY, or leave both blank.');

const coordinator = new ShardCoordinator({
	shardCount,
	workers: workerAssignments(shardCount),
	botToken: requiredEnv('DISCORD_TOKEN'),
	statePath: Bun.env.SHARD_STATE_PATH?.trim() || './sharding.sqlite',
	hostname: Bun.env.SHARD_COORDINATOR_HOST?.trim() || '127.0.0.1',
	port: integerEnv('SHARD_COORDINATOR_PORT', 8080, 1, 65535),
	tls: cert && key ? { cert: Bun.file(cert), key: Bun.file(key) } : undefined
});

onShutdown(() => coordinator.close());
try {
	await coordinator.start();
	console.log(`Coordinator listening at ${coordinator.url}; ${shardCount} shards configured.`);
} catch (error) {
	await coordinator.close();
	throw error;
}
