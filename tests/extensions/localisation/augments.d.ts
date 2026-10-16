import type { InternationalizationClientOptions } from "../../../src/extensions/localisation/index";
import type { LocaleManager } from "../../../src/extensions/localisation/LocaleManager";

declare module "../../../src/core/modules/index" {
	interface Container {
		client: import("../../../src/core/client/KairoClient").KairoClient;
		i18n: LocaleManager;
	}
}

declare module "discord.js" {
	export interface ClientOptions extends InternationalizationClientOptions {
		/** Localisation options used by test clients. */
		internationalization?: InternationalizationClientOptions["internationalization"];
	}
}
