import { type } from 'kairojs/validation';

/** Names identify configuration problems without printing their values. */
export class ExampleConfigurationError extends Error {
	public constructor(
		public readonly setting: string,
		message: string,
		options?: ErrorOptions
	) {
		super(message, options);
		this.name = 'ExampleConfigurationError';
	}
}

export function requiredEnv(name: string): string {
	const value = Bun.env[name]?.trim();
	if (!value || value.startsWith('replace_with_'))
		throw new ExampleConfigurationError(name, `Missing ${name}; set it in examples/.env before starting this process.`);
	return value;
}

export function integerEnv(name: string, fallback: number, min: number, max: number): number {
	const input = Bun.env[name]?.trim();
	const value = input ? Number(input) : fallback;
	if (!Number.isInteger(value) || value < min || value > max)
		throw new ExampleConfigurationError(name, `${name} must be an integer from ${min} to ${max}; check the example environment file.`);
	return value;
}

export function workerAssignments(shardCount: number) {
	const input = Bun.env.SHARD_WORKERS?.trim();
	if (input) {
		try {
			return type({ id: 'string', token: 'string', shards: 'number.integer[]', '+': 'reject' }).array().assert(JSON.parse(input));
		} catch (cause) {
			throw new ExampleConfigurationError(
				'SHARD_WORKERS',
				'SHARD_WORKERS must be a JSON list of hosts with id, token and shard assignments.',
				{ cause }
			);
		}
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
	if (id && !/^\d{17,20}$/.test(id))
		throw new ExampleConfigurationError(
			'DEV_GUILD_ID',
			'DEV_GUILD_ID must be a Discord guild ID; leave it blank to register commands globally.'
		);
	return id || undefined;
}
