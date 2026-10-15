import type { InternationalizationClientOptions } from '../../../src/extensions/localisation/index';
import type { LocaleManager } from '../../../src/extensions/localisation/LocaleManager';

declare module '../../../src/core/modules/index' {
	interface Container {
		client: any; // Client type doesn't really matter for tests but needs to be there for the type checker
		i18n: LocaleManager;
	}
}

declare module 'discord.js' {
	export interface ClientOptions extends InternationalizationClientOptions {}
}
