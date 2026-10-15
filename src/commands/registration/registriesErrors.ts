import { writeEvent } from '../../core/logging/diagnostics';
import { container } from '../../core/modules/index';
import { Events } from '../../events/events';
import type { Command } from '../Command';
import { bulkOverwriteError } from './registriesLog';

/** Opinionatedly logs the encountered registry error. */
export function emitPerRegistryError(error: unknown, command: Command<any, any>) {
	const { name, location } = command;
	const { client, logger } = container;

	if (client.listenerCount(Events.CommandApplicationCommandRegistryError)) {
		client.emit(Events.CommandApplicationCommandRegistryError, error, command);
	} else {
		writeEvent(logger, 'error', {
			component: 'rest.registration',
			event: 'command_registration_failed',
			message: 'Application command registration failed.',
			error,
			context: { command: name, path: location.full }
		});
	}
}

/** Opinionatedly logs any bulk overwrite registries error. */
export function emitBulkOverwriteError(error: unknown, guildId: string | null) {
	const { client } = container;

	if (client.listenerCount(Events.ApplicationCommandRegistriesBulkOverwriteError)) {
		client.emit(Events.ApplicationCommandRegistriesBulkOverwriteError, error, guildId);
	} else if (guildId) {
		bulkOverwriteError(`Failed to overwrite guild application commands for guild ${guildId}`, error);
	} else {
		bulkOverwriteError(`Failed to overwrite global application commands`, error);
	}
}
