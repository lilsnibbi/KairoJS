import { writeLog } from '../../core/logging/diagnostics';
import { Events, type MessageCommandErrorPayload } from '../events';
import { Listener } from '../listener';

export class MessageErrorListener extends Listener<typeof Events.MessageCommandError> {
	public constructor(context: Listener.Context) {
		super(context, { event: Events.MessageCommandError });
	}

	public run(error: unknown, context: MessageCommandErrorPayload) {
		const { name, location } = context.command;
		writeLog(this.container.logger, 'error', `Encountered error on message command "${name}" at path "${location.full}"`, error);
	}
}
