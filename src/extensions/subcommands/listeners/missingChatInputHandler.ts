import { type ChatInputCommand } from '../../../commands/types';
import { writeLog } from '../../../core/logging/diagnostics';
import { Listener } from '../../../events/listener';
import { type ChatInputSubcommandErrorPayload, SubcommandEvents } from '../types/Events';
import type { SubcommandMappingMethod } from '../types/mappings';

export class MissingChatInputHandlerListener extends Listener<typeof SubcommandEvents.SubcommandMappingIsMissingChatInputCommandHandler> {
	public constructor(context: Listener.Context) {
		super(context, { event: SubcommandEvents.SubcommandMappingIsMissingChatInputCommandHandler });
	}

	public override run(_: ChatInputCommand.Interaction, subcommand: SubcommandMappingMethod, context: ChatInputSubcommandErrorPayload) {
		const { name, location } = context.command;
		writeLog(
			this.container.logger,
			'error',
			`Encountered a missing mapping on chat input subcommand "${name}" at "${location.full}"`,
			subcommand
		);
	}
}
