import { writeLog } from '../../core/logging/diagnostics';
import { type ChatInputCommandErrorPayload, Events } from '../events';
import { Listener } from '../listener';

export class ChatInputErrorListener extends Listener<typeof Events.ChatInputCommandError> {
	public constructor(context: Listener.Context) {
		super(context, { event: Events.ChatInputCommandError });
	}

	public run(error: unknown, context: ChatInputCommandErrorPayload) {
		const { name, location } = context.command;
		writeLog(this.container.logger, 'error', `Encountered error on chat input command "${name}" at path "${location.full}"`, error);
	}
}
