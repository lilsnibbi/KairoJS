import type { KairoClient } from "../../core/client/KairoClient";
import { Extension } from "../../core/lifecycle/Extension";
import { loadListeners, PatternCommandStore } from "./index";
/** Built-in extension for regex message commands. Configure it through client.options.extensions. */
export class PatternExtension extends Extension {
	/**
	 * Register regex message commands during client construction.
	 * @param client - Client being configured.
	 */
	static override setup(client: KairoClient): void {
		client.modules.register(new PatternCommandStore());
		loadListeners();
	}
}
