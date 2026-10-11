import { writeLog } from '../../core/logging/diagnostics';
import { container } from '../../core/modules/index';

export function bulkOverwriteError(message: string, ...other: unknown[]) {
	writeLog(container.logger, 'error', `ApplicationCommandRegistries(BulkOverwrite) ${message}`, ...other);
}

export function bulkOverwriteWarn(message: string, ...other: unknown[]) {
	writeLog(container.logger, 'alert', `ApplicationCommandRegistries(BulkOverwrite) ${message}`, ...other);
}

export function bulkOverwriteDebug(message: string, ...other: unknown[]) {
	writeLog(container.logger, 'debug', `ApplicationCommandRegistries(BulkOverwrite) ${message}`, ...other);
}
