import type { KairoClient } from '../../core/client/KairoClient';
import { Extension } from '../../core/lifecycle/Extension';
import { Services } from './index';
export class ServicesExtension extends Extension {
	static override setup(client: KairoClient): void {
		client.services = new Services();
		client.modules.register(client.services.store);
	}
}
