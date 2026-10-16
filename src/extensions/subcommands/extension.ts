import type { KairoClient } from "../../core/client/KairoClient";
import { Extension } from "../../core/lifecycle/Extension";
import { loadListeners, loadPreconditions } from "./index";
export class SubcommandsExtension extends Extension {
	static override setup(client: KairoClient): void {
		loadPreconditions();
		const options = client.options.extensions?.subcommands;
		if (options !== false && options?.logErrors !== false) loadListeners();
	}
}
