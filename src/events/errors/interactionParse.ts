import { writeLog } from '../../core/logging/diagnostics';
import { Events, type InteractionHandlerParseError as InteractionHandlerParseErrorPayload } from '../events';
import { Listener } from '../listener';

export class InteractionParseErrorListener extends Listener<typeof Events.InteractionHandlerParseError> {
	public constructor(context: Listener.Context) {
		super(context, { event: Events.InteractionHandlerParseError });
	}

	public run(error: unknown, context: InteractionHandlerParseErrorPayload) {
		const { name, location } = context.handler;
		writeLog(
			this.container.logger,
			'error',
			`Encountered error while handling an interaction handler parse method for interaction-handler "${name}" at path "${location.full}"`,
			error
		);
	}
}
