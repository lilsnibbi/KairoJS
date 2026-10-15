import { type LogEntry, makeRecord, renderRecord, supportsColor } from '../src/core/logging/format';
import type { LogLevel } from '../src/core/logging/index';

// Deterministic synthetic preview. No clients, credentials, services, timers or network.
const format = process.argv.includes('--json') ? 'json' : 'text';
const date = new Date('2026-10-15T12:30:45.123Z');
const connection = Object.assign(new Error('Synthetic provider content is omitted'), { code: 'ECONNREFUSED' });
connection.stack = 'Error: Synthetic provider content\n    at connect (/app/src/engine/client/EngineClient.ts:42:3)';
const task = new TypeError('Synthetic job payload is omitted', { cause: connection });
task.stack = 'TypeError: Synthetic job payload\n    at run (/app/src/extensions/scheduledTasks/TaskScheduler.ts:88:4)';
const rejection = Object.assign(new Error('Synthetic response body'), { status: 403, code: 50013 });
rejection.stack = 'Error: Synthetic response body\n    at fetch (/app/src/commands/registration/getNeededParameters.ts:33:4)';
const storage = Object.assign(new Error('Synthetic storage details'), { code: 'ECONNREFUSED' });
storage.stack = 'Error: Synthetic storage details\n    at settle (/app/src/extensions/scheduledTasks/TaskScheduler.ts:331:4)';
const samples: { level: LogLevel; entry: LogEntry }[] = [
	{
		level: 'DEBUG',
		entry: {
			component: 'modules',
			event: 'loaded',
			message: 'Module loading finished; valid handlers are registered.',
			context: { stores: 8, modules: 42 }
		}
	},
	{
		level: 'NOTIF',
		entry: {
			component: 'rest.registration',
			event: 'completed',
			message: 'Command registration pass finished.',
			context: { registries: 7, durationMs: 18 }
		}
	},
	{
		level: 'NOTIF',
		entry: {
			component: 'client',
			event: 'ready',
			message: 'Discord connected; this client can now handle events.',
			context: { shard: 0, commands: 7, guilds: 12, shards: 1 }
		}
	},
	{
		level: 'ALERT',
		entry: {
			component: 'rest.registration',
			event: 'name_alias_added',
			message:
				'Expected a numeric Discord command ID; accepted this value as a name alias. Use addChatInputCommandIds with a real command ID.',
			context: { command: 'fixture', alias: 'fixture', kind: 'chat input' }
		}
	},
	{
		level: 'NOTIF',
		entry: {
			component: 'rest.registration',
			event: 'command_updated',
			message: 'Updated a Discord command to match its local definition.',
			context: { command: 'fixture', commandId: '123456789012345678', scope: 'global', guildId: null }
		}
	},
	{
		level: 'ALERT',
		entry: {
			component: 'rest.registration',
			event: 'differences_found',
			message: 'Discord command differs from local code; this registration is configured to report differences without updating Discord.',
			context: { command: 'fixture', commandId: '123456789012345678' }
		}
	},
	{
		level: 'NOTIF',
		entry: {
			component: 'sharding.manager',
			event: 'assigned',
			message: 'Host connected to the coordinator; shard assignments received.',
			context: { host: 'fixture-host', shards: [0, 1], count: 2 }
		}
	},
	{
		level: 'ERROR',
		entry: {
			component: 'engine.gateway',
			event: 'operation_failed',
			message: 'Gateway connection interrupted; inspect transport diagnostics while recovery proceeds.',
			context: { shard: 1, fatal: false, state: 'reconnecting', pendingHandlers: 0 },
			error: connection
		}
	},
	{
		level: 'ALERT',
		entry: {
			component: 'rest.registration',
			event: 'guild_fetch_failed',
			message: "Could not read this guild's Discord commands; verify the application is installed with applications.commands access.",
			context: { guildId: 'fixture-guild' },
			error: rejection
		}
	},
	{
		level: 'ERROR',
		entry: {
			component: 'tasks',
			event: 'task_failed',
			message: "Scheduled task execution failed; inspect this task's run handler.",
			context: { task: 'fixture-task', path: 'tasks/fixture.ts' },
			error: task
		}
	},
	{
		level: 'ERROR',
		entry: {
			component: 'tasks.storage',
			event: 'settlement_failed',
			message: 'Task result could not be saved; an expired lease can allow another execution. Check storage before retrying manually.',
			context: { queue: 'fixture', storage: 'redis', task: 'fixture-task', jobId: 'fixture-job' },
			error: storage
		}
	},
	{
		level: 'ALERT',
		entry: {
			component: 'localisation',
			event: 'diagnostic',
			message: 'Command translation is missing; add the named key or check the configured fallback locale.',
			context: { code: 'missing', locale: 'en-US', namespace: 'fixture', key: 'fixture.title', strict: false }
		}
	}
];
for (const sample of samples) {
	const stream = sample.level === 'ERROR' || sample.level === 'ALERT' ? process.stderr : process.stdout;
	stream.write(
		`${renderRecord(makeRecord('KairoJS', sample.level, sample.entry, date, 'short'), format, supportsColor(process.env, !!stream.isTTY))}\n`
	);
}
