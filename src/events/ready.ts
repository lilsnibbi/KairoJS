import { handleRegistryAPICalls } from '../commands/registration/registries';
import { Events } from './events';
import { Listener } from './listener';

export class ReadyListener extends Listener {
	public constructor(context: Listener.Context) {
		super(context, { event: Events.ClientReady, once: true });
	}

	public async run() {
		this.container.client.id ??= this.container.client.user?.id ?? null;

		await handleRegistryAPICalls();
	}
}
