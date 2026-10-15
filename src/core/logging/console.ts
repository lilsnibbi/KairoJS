import { Logger, type LoggerOptions, type LogLevel } from '@lilsnibbi/logger';
import { type ConsoleLogOptions, makeRecord, renderRecord, supportsColor } from './format';

const managed = new WeakSet<object>();
const levels: Record<string, LogLevel> = { debug: 'DEBUG', info: 'NOTIF', warn: 'ALERT', error: 'ERROR', notif: 'NOTIF', alert: 'ALERT' };

/** Reuse the dependency's level filtering, streams and lifecycle. Custom output options retain their original behavior. */
export function createConsoleLogger(name = 'KairoJS', options: Partial<LoggerOptions> = {}, output: ConsoleLogOptions = {}): Logger {
	const requestedLevel = process.env.KAIRO_LOG_LEVEL?.toLowerCase() ?? 'info';
	const level = options.level ?? (Object.hasOwn(levels, requestedLevel) ? levels[requestedLevel] : 'NOTIF');
	if (
		[
			'format',
			'serialize',
			'layout',
			'box',
			'file',
			'theme',
			'timeformat',
			'includeTimestamps',
			'inspectDepth',
			'relativePaths',
			'symbols',
			'dividerWidth',
			'filter',
			'transport'
		].some((key) => Object.hasOwn(options, key) && Reflect.get(options, key) !== undefined)
	)
		return new Logger({ name, level, ...options });
	const format = output.format ?? (process.env.KAIRO_LOG_FORMAT === 'json' ? 'json' : 'text');
	const stackSetting = output.stacks ?? process.env.KAIRO_LOG_STACKS;
	const stacks = stackSetting === 'off' || stackSetting === 'full' ? stackSetting : 'short';
	const secrets = [
		...(output.redact ?? []),
		...Object.entries(process.env).flatMap(([key, value]) =>
			/TOKEN|SECRET|PASSWORD|CREDENTIAL|API[_-]?KEY|CONNECTION_STRING|DATABASE_URL|REDIS_URL|WEBHOOK.*URL/i.test(key) && value
				? [value]
				: []
		)
	]
		.filter((value) => value.length >= 6)
		.sort((a, b) => b.length - a.length)
		.slice(0, 64);
	const logger = new Logger({
		...options,
		name: options.name ?? name,
		level,
		colors: false,
		includeTimestamps: false,
		serialize: () => '',
		format: (_parts, context) =>
			renderRecord(
				makeRecord(context.name, context.level, context.value, context.date, stacks, secrets),
				format,
				context.destination === 'console' &&
					supportsColor(
						process.env,
						!!process[context.level === 'ALERT' || context.level === 'ERROR' ? 'stderr' : 'stdout'].isTTY,
						options.colors
					)
			)
	});
	managed.add(logger);
	return logger;
}

/** @internal Distinguish framework defaults from user-owned loggers without mutating instances. */
export function isConsoleLogger(logger: object): boolean {
	return managed.has(logger);
}

let fallback: Logger | undefined;
/** @internal No file, timers, global console interception or network. */
export function fallbackLogger(): Logger {
	return (fallback ??= createConsoleLogger());
}
