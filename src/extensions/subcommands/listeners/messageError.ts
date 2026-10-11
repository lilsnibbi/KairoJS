import { writeLog } from '../../../core/logging/diagnostics';
import { Listener } from '../../../events/listener';
import { type MessageSubcommandErrorPayload, SubcommandEvents } from '../types/Events';

export class MessageErrorListener extends Listener<typeof SubcommandEvents.MessageSubcommandError> {
	public constructor(context: Listener.Context) {
		super(context, { event: SubcommandEvents.MessageSubcommandError });
	}

	public override run(error: unknown, context: MessageSubcommandErrorPayload) {
		const { name, location } = context.command;
		writeLog(this.container.logger, 'error', `Encountered error on message subcommand "${name}" at path "${location.full}"`, error);
	}
}
