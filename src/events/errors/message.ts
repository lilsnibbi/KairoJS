import { writeEvent } from '../../core/logging/diagnostics';
import { Events, type MessageCommandErrorPayload } from '../events';
import { Listener } from '../listener';

export class MessageErrorListener extends Listener<typeof Events.MessageCommandError> {
	public constructor(context: Listener.Context) {
		super(context, { event: Events.MessageCommandError });
	}

	public run(error: unknown, context: MessageCommandErrorPayload) {
		const { name, location } = context.command;
		writeEvent(this.container.logger, 'error', {
			component: 'commands',
			event: 'message_command_failed',
			message: 'Message command failed.',
			error,
			context: { command: name, path: location.full }
		});
	}
}
