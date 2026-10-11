import type { Message } from 'discord.js';
import { Args } from '../../../commands/arguments/Args';
import { writeLog } from '../../../core/logging/diagnostics';
import { Listener } from '../../../events/listener';
import { type MessageSubcommandNoMatchContext, SubcommandEvents } from '../types/Events';

export class MessageNoMatchListener extends Listener<typeof SubcommandEvents.MessageSubcommandNoMatch> {
	public constructor(context: Listener.Context) {
		super(context, { event: SubcommandEvents.MessageSubcommandNoMatch });
	}

	public override run(_message: Message, _args: Args, context: MessageSubcommandNoMatchContext) {
		writeLog(this.container.logger, 'error', context.message);
	}
}
