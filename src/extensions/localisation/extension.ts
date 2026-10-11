import type { KairoClient } from '../../core/client/KairoClient';
import { Extension } from '../../core/lifecycle/Extension';
import { container } from '../../core/modules/index';
import { LocaleManager } from './index';

export class LocaleExtension extends Extension {
	static override setup(client: KairoClient): void {
		container.i18n = new LocaleManager(client.options.extensions?.localisation || undefined);
	}
	static override async beforeLogin(): Promise<void> {
		await container.i18n.init();
	}
}
