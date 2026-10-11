import { type ChatInputCommand } from '../../../commands/types';
import { writeLog } from '../../../core/logging/diagnostics';
import { Listener } from '../../../events/listener';
import { type ChatInputSubcommandNoMatchContext, SubcommandEvents } from '../types/Events';

export class ChatInputNoMatchListener extends Listener<typeof SubcommandEvents.ChatInputSubcommandNoMatch> {
	public constructor(context: Listener.Context) {
		super(context, { event: SubcommandEvents.ChatInputSubcommandNoMatch });
	}

	public override run(_interaction: ChatInputCommand.Interaction, context: ChatInputSubcommandNoMatchContext) {
		writeLog(this.container.logger, 'error', context.message);
	}
}
