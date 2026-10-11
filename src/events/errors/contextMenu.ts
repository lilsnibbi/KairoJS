import { writeLog } from '../../core/logging/diagnostics';
import { type ContextMenuCommandErrorPayload, Events } from '../events';
import { Listener } from '../listener';

export class ContextMenuErrorListener extends Listener<typeof Events.ContextMenuCommandError> {
	public constructor(context: Listener.Context) {
		super(context, { event: Events.ContextMenuCommandError });
	}

	public run(error: unknown, context: ContextMenuCommandErrorPayload) {
		const { name, location } = context.command;
		writeLog(this.container.logger, 'error', `Encountered error on message command "${name}" at path "${location.full}"`, error);
	}
}
