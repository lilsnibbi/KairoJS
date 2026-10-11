import type { LoggerLike } from './LoggerLike';

/** Keep context and causes together, including with single-value loggers. */
export function writeLog(logger: LoggerLike, level: keyof LoggerLike, message: unknown, ...details: unknown[]): void {
	logger[level](details.length === 0 ? message : new Error(String(message), { cause: details.length === 1 ? details[0] : details }));
}
