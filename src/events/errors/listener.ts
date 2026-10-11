import { writeLog } from '../../core/logging/diagnostics';
import { Events, type ListenerErrorPayload } from '../events';
import { Listener } from '../listener';

export class ListenerErrorListener extends Listener<typeof Events.ListenerError> {
	public constructor(context: Listener.Context) {
		super(context, { event: Events.ListenerError });
	}

	public run(error: unknown, context: ListenerErrorPayload) {
		const { name, event, location } = context.module;
		writeLog(
			this.container.logger,
			'error',
			`Encountered error on event listener "${name}" for event "${String(event)}" at path "${location.full}"`,
			error
		);
	}
}
