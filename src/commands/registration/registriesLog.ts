import { writeEvent } from '../../core/logging/diagnostics';
import { container } from '../../core/modules/index';

export function bulkOverwriteError(message: string, ...other: unknown[]) {
	writeEvent(container.logger, 'error', {
		component: 'rest.registration',
		event: 'bulk_overwrite_failed',
		message,
		error: other.length === 1 ? other[0] : other.length ? new AggregateError(other) : undefined
	});
}

export function bulkOverwriteWarn(message: string, ...other: unknown[]) {
	writeEvent(container.logger, 'alert', {
		component: 'rest.registration',
		event: 'bulk_overwrite_warning',
		message,
		context: { detailCount: other.length }
	});
}

export function bulkOverwriteDebug(message: string, ...other: unknown[]) {
	writeEvent(container.logger, 'debug', {
		component: 'rest.registration',
		event: 'bulk_overwrite_detail',
		message,
		context: { detailCount: other.length }
	});
}
