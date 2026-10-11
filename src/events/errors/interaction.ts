import { writeLog } from '../../core/logging/diagnostics';
import { Events, type InteractionHandlerError } from '../events';
import { Listener } from '../listener';

export class InteractionErrorListener extends Listener<typeof Events.InteractionHandlerError> {
	public constructor(context: Listener.Context) {
		super(context, { event: Events.InteractionHandlerError });
	}

	public run(error: unknown, context: InteractionHandlerError) {
		const { name, location } = context.handler;
		writeLog(
			this.container.logger,
			'error',
			`Encountered error while handling an interaction handler run method for interaction-handler "${name}" at path "${location.full}"`,
			error
		);
	}
}
