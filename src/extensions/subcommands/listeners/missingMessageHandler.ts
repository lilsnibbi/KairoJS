import type { Message } from 'discord.js';
import { writeLog } from '../../../core/logging/diagnostics';
import { Listener } from '../../../events/listener';
import { type MessageSubcommandErrorPayload, SubcommandEvents } from '../types/Events';
import type { SubcommandMappingMethod } from '../types/mappings';

export class MissingMessageHandlerListener extends Listener<typeof SubcommandEvents.SubcommandMappingIsMissingMessageCommandHandler> {
	public constructor(context: Listener.Context) {
		super(context, { event: SubcommandEvents.SubcommandMappingIsMissingMessageCommandHandler });
	}

	public override run(_: Message, subcommand: SubcommandMappingMethod, context: MessageSubcommandErrorPayload) {
		const { name, location } = context.command;
		writeLog(
			this.container.logger,
			'error',
			`Encountered a missing mapping on message subcommand "${name}" at "${location.full}"`,
			subcommand
		);
	}
}
