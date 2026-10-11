import { writeLog } from '../../core/logging/diagnostics';
import { type AutocompleteInteractionPayload, Events } from '../events';
import { Listener } from '../listener';

export class AutocompleteErrorListener extends Listener<typeof Events.CommandAutocompleteInteractionError> {
	public constructor(context: Listener.Context) {
		super(context, { event: Events.CommandAutocompleteInteractionError });
	}

	public run(error: unknown, context: AutocompleteInteractionPayload) {
		const { name, location } = context.command;
		writeLog(
			this.container.logger,
			'error',
			`Encountered error while handling an autocomplete run method on command "${name}" at path "${location.full}"`,
			error
		);
	}
}
