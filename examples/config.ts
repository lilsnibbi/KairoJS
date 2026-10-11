import { type } from 'kairojs/validation';

export function requiredEnv(name: string): string {
	const value = Bun.env[name]?.trim();
	if (!value || value.startsWith('replace_with_')) throw new Error(`Set ${name} in your environment or examples/.env.`);
	return value;
}

export function integerEnv(name: string, fallback: number, min: number, max: number): number {
	const input = Bun.env[name]?.trim();
	const value = input ? Number(input) : fallback;
	if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${name} must be an integer from ${min} to ${max}.`);
	return value;
}

export function workerAssignments(shardCount: number) {
	const input = Bun.env.SHARD_WORKERS?.trim();
	if (input) {
		return type({ id: 'string', token: 'string', shards: 'number.integer[]', '+': 'reject' }).array().assert(JSON.parse(input));
	}
	return [
		{
			id: Bun.env.SHARD_HOST_ID?.trim() || 'local',
			token: requiredEnv('SHARD_HOST_TOKEN'),
			shards: Array.from({ length: shardCount }, (_, id) => id)
		}
	];
}

export function developmentGuild(): string | undefined {
	const id = Bun.env.DEV_GUILD_ID?.trim();
	if (id && !/^\d{17,20}$/.test(id)) throw new Error('DEV_GUILD_ID must be a Discord server ID, or blank for global commands.');
	return id || undefined;
}
