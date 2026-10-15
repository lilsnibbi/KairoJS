import { createConsoleLogger, type LoggerLike, logEvent } from 'kairojs/engine';
import { ExampleConfigurationError } from './config';

// One logger per process; framework and example records use the same output settings.
export const exampleLogger = createConsoleLogger('Example');

export function startupFailed(component: string, error: unknown, logger: LoggerLike = exampleLogger): void {
	logEvent(logger, 'error', {
		component,
		event: 'startup_failed',
		message:
			error instanceof ExampleConfigurationError
				? error.message
				: 'Example process could not start; inspect its configuration and the diagnostic cause.',
		context: error instanceof ExampleConfigurationError ? { setting: error.setting } : undefined,
		error
	});
	process.exitCode = 1;
}

export async function cleanupFailedStartup(
	close: () => Promise<unknown>,
	component: string,
	logger: LoggerLike = exampleLogger
): Promise<void> {
	try {
		await close();
	} catch (error) {
		logEvent(logger, 'error', {
			component,
			event: 'startup_cleanup_failed',
			message: 'Failed startup left resources that could not be released; inspect the cleanup cause.',
			error
		});
	}
}
