import { fallbackLogger, isConsoleLogger } from './console';
import { contextText, type LogEntry } from './format';
import type { LoggerLike } from './LoggerLike';
import { safeContext } from './redact';

/** Keep context and causes together, including with single-value loggers. */
export function writeLog(logger: LoggerLike, level: keyof LoggerLike, message: unknown, ...details: unknown[]): void {
	logger[level](details.length === 0 ? message : new Error(String(message), { cause: details.length === 1 ? details[0] : details }));
}

/** Preserve the four-method contract and original error cause for custom loggers. */
export function writeEvent(logger: LoggerLike, level: keyof LoggerLike, entry: LogEntry): void {
	try {
		if (isConsoleLogger(logger)) {
			logger[level](entry);
			return;
		}
		const context = contextText(safeContext(entry.context));
		const message = `[${entry.component} ${entry.event}] ${entry.message}${context ? ` | ${context}` : ''}`;
		logger[level](entry.error === undefined ? message : new Error(message, { cause: entry.error }));
	} catch (error) {
		// New milestones must not make a sink failure change startup, retries or cleanup.
		try {
			fallbackLogger().error({
				component: 'logging',
				event: 'sink_failed',
				message: 'Logger failed while reporting an operation.',
				error,
				context: { sourceComponent: entry.component, sourceEvent: entry.event }
			} satisfies LogEntry);
		} catch {
			/* Unavailable output cannot replace an application failure. */
		}
	}
}
