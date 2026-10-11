import type { ApplicationCommand, Collection, Snowflake } from 'discord.js';
import { writeLog } from '../../../core/logging/diagnostics';
import { Events } from '../../../events/events';
import { Listener } from '../../../events/listener';

export class BulkOverwriteListener extends Listener<typeof Events.ApplicationCommandRegistriesBulkOverwrite> {
	public constructor(context: Listener.Context) {
		super(context, { event: Events.ApplicationCommandRegistriesBulkOverwrite });
	}

	public run(result: Collection<Snowflake, ApplicationCommand>, guildId: string | null) {
		if (guildId) {
			writeLog(
				this.container.logger,
				'notif',
				`ApplicationCommandRegistries(BulkOverwrite) Successfully overwrote guild application commands for guild ${guildId}. The application now has ${result.size} guild commands for guild ${guildId}`
			);
		} else {
			writeLog(
				this.container.logger,
				'notif',
				`ApplicationCommandRegistries(BulkOverwrite) Successfully overwrote global application commands. The application now has ${result.size} global commands`
			);
		}
	}
}
