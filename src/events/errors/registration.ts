import type { Command } from '../../commands/Command';
import { writeLog } from '../../core/logging/diagnostics';
import { Events } from '../events';
import { Listener } from '../listener';

export class RegistrationErrorListener extends Listener<typeof Events.CommandApplicationCommandRegistryError> {
	public constructor(context: Listener.Context) {
		super(context, { event: Events.CommandApplicationCommandRegistryError });
	}

	public run(error: unknown, command: Command) {
		const { name, location } = command;
		writeLog(
			this.container.logger,
			'error',
			`Encountered error while handling the command application command registry for command "${name}" at path "${location.full}"`,
			error
		);
	}
}
