import { writeLog } from '../../../core/logging/diagnostics';
import { Listener } from '../../../events/listener';
import { type ChatInputSubcommandErrorPayload, SubcommandEvents } from '../types/Events';

export class ChatInputErrorListener extends Listener<typeof SubcommandEvents.ChatInputSubcommandError> {
	public constructor(context: Listener.Context) {
		super(context, { event: SubcommandEvents.ChatInputSubcommandError });
	}

	public override run(error: unknown, context: ChatInputSubcommandErrorPayload) {
		const { name, location } = context.command;
		writeLog(this.container.logger, 'error', `Encountered error on chat input subcommand "${name}" at path "${location.full}"`, error);
	}
}
