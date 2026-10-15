import { type LogEntry, makeRecord, renderRecord, supportsColor } from '../src/core/logging/format';
import type { LogLevel } from '../src/core/logging/index';

// Deterministic synthetic preview. No clients, credentials, services, timers or network.
const format = process.argv.includes('--json') ? 'json' : 'text';
const date = new Date('2026-10-14T12:30:45.123Z');
const connection = Object.assign(new Error('Synthetic provider content is omitted'), { code: 'ECONNREFUSED' });
connection.stack = 'Error: Synthetic provider content\n    at connect (/app/src/engine/client/EngineClient.ts:42:3)';
const task = new TypeError('Synthetic job payload is omitted', { cause: connection });
task.stack = 'TypeError: Synthetic job payload\n    at run (/app/src/extensions/scheduledTasks/TaskScheduler.ts:88:4)';
const rejection = Object.assign(new Error('Synthetic response body'), { status: 403, code: 50013 });
rejection.stack = 'Error: Synthetic response body\n    at fetch (/app/src/commands/registration/getNeededParameters.ts:33:4)';
const samples: { level: LogLevel; entry: LogEntry }[] = [
	{
		level: 'DEBUG',
		entry: { component: 'modules', event: 'loaded', message: 'Configured modules loaded.', context: { stores: 8, modules: 42 } }
	},
	{
		level: 'NOTIF',
		entry: {
			component: 'rest.registration',
			event: 'completed',
			message: 'Application command registries initialized.',
			context: { durationMs: 18 }
		}
	},
	{ level: 'NOTIF', entry: { component: 'client', event: 'ready', message: 'Discord client ready.', context: { commands: 7, shards: 2 } } },
	{
		level: 'NOTIF',
		entry: {
			component: 'sharding.manager',
			event: 'assigned',
			message: 'Coordinator assigned local shards.',
			context: { host: 'fixture-host', shards: [0, 1], count: 2 }
		}
	},
	{
		level: 'ERROR',
		entry: {
			component: 'engine.gateway',
			event: 'operation_failed',
			message: 'Engine operation failed.',
			context: { shard: 1, fatal: false },
			error: connection
		}
	},
	{
		level: 'ALERT',
		entry: {
			component: 'rest.registration',
			event: 'guild_fetch_failed',
			message: 'Guild command fetch failed; check the applications.commands authorization scope.',
			context: { guildId: 'fixture-guild' },
			error: rejection
		}
	},
	{
		level: 'ERROR',
		entry: {
			component: 'tasks',
			event: 'task_failed',
			message: 'Scheduled task failed.',
			context: { task: 'fixture-task', path: 'tasks/fixture.ts' },
			error: task
		}
	},
	{
		level: 'ALERT',
		entry: {
			component: 'localisation',
			event: 'diagnostic',
			message: 'Localisation resource or translation issue; check files and keys.',
			context: { code: 'missing', locale: 'en-US', namespace: 'fixture', key: 'fixture.title' }
		}
	}
];
for (const sample of samples) {
	const stream = sample.level === 'ERROR' || sample.level === 'ALERT' ? process.stderr : process.stdout;
	stream.write(
		`${renderRecord(makeRecord('KairoJS', sample.level, sample.entry, date, 'short'), format, supportsColor(process.env, !!stream.isTTY))}\n`
	);
}
