import type { ApplicationCommand, Collection, Snowflake } from 'discord.js';
import { writeEvent } from '../../../core/logging/diagnostics';
import { Events } from '../../../events/events';
import { Listener } from '../../../events/listener';

export class BulkOverwriteListener extends Listener<typeof Events.ApplicationCommandRegistriesBulkOverwrite> {
	public constructor(context: Listener.Context) {
		super(context, { event: Events.ApplicationCommandRegistriesBulkOverwrite });
	}

	public run(result: Collection<Snowflake, ApplicationCommand>, guildId: string | null) {
		writeEvent(this.container.logger, 'notif', {
			component: 'rest.registration',
			event: 'overwritten',
			message: 'Replaced the Discord command list for this scope.',
			context: { scope: guildId ? 'guild' : 'global', guildId, commands: result.size }
		});
	}
}
