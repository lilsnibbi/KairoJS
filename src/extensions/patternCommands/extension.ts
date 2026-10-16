import type { KairoClient } from "../../core/client/KairoClient";
import { Extension } from "../../core/lifecycle/Extension";
import { loadListeners, PatternCommandStore } from "./index";
export class PatternExtension extends Extension {
	static override setup(client: KairoClient): void {
		client.modules.register(new PatternCommandStore());
		loadListeners();
	}
}
