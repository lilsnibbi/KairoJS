import { createBot } from './client';
import { requiredEnv } from './config';
import { onShutdown } from './shutdown';

const offline = process.argv.includes('--offline');
const token = offline ? undefined : requiredEnv('DISCORD_TOKEN');
const client = createBot();
onShutdown(() => client.destroy());

try {
	if (!client.sharding.enabled) throw new Error('Start host.ts instead. The host starts bot.ts once for each assigned shard.');
	if (offline) {
		// The offline check uses this exact bot and modules, but skips Discord login.
		await client.load();
		await client.sharding.connect();
	} else {
		await client.login(token);
	}
} catch (error) {
	await client.destroy();
	throw error;
}
