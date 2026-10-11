import './contracts';
import { GatewayIntentBits } from 'discord.js';
import { KairoClient } from 'kairojs/client';
import { ApplicationCommandRegistries } from 'kairojs/commands';
import { developmentGuild } from './config';

export function createBot(): KairoClient {
	const guildId = developmentGuild();
	ApplicationCommandRegistries.setDefaultGuildIds(guildId ? [guildId] : undefined);
	const client = new KairoClient({
		intents: [GatewayIntentBits.Guilds],
		root: import.meta.dir,
		modules: { commands: 'commands/**/*.ts', listeners: 'listeners/**/*.ts' },
		extensions: { localisation: false, scheduledtasks: false, patternCommands: false, subcommands: false, services: false }
	});
	client.sharding.handle('exampleStats', () => ({
		shard: client.sharding.id ?? 0,
		pid: process.pid,
		guilds: client.guilds.cache.size,
		uptimeSeconds: Math.floor(process.uptime()),
		memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
		ready: client.isReady(),
		commands: [...client.modules.require('commands').keys()].sort()
	}));
	return client;
}
