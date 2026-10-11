import { writeLog } from '../../../core/logging/diagnostics';
import { Events } from '../../../events/events';
import { Listener } from '../../../events/listener';

export class InitialisingListener extends Listener<typeof Events.ApplicationCommandRegistriesInitialising> {
	public constructor(context: Listener.Context) {
		super(context, { event: Events.ApplicationCommandRegistriesInitialising, once: true });
	}

	public run() {
		writeLog(this.container.logger, 'notif', 'ApplicationCommandRegistries: Initializing...');
	}
}
