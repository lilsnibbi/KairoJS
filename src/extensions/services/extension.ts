import type { KairoClient } from "../../core/client/KairoClient";
import { Extension } from "../../core/lifecycle/Extension";
import { Services } from "./index";
/** Built-in extension for shared service modules. Configure it through client.options.extensions. */
export class ServicesExtension extends Extension {
	/**
	 * Register shared service modules during client construction.
	 * @param client - Client being configured.
	 */
	static override setup(client: KairoClient): void {
		client.services = new Services();
		client.modules.register(client.services.store);
	}
}
