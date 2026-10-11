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
		logger.error(
			new Error(
				`Encountered error while handling the command application command registry for command "${name}" at path "${location.full}"`,
				{ cause: error }
			)
		);
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
