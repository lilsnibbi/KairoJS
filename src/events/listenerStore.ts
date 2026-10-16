import { ModuleStore } from "../core/modules/index";
import { Listener } from "./listener";
import { ListenerModuleLoader } from "./listenerModuleLoader";

export class ListenerStore extends ModuleStore<Listener, "listeners"> {
	public constructor() {
		super(Listener, {
			name: "listeners",
			strategy: new ListenerModuleLoader(),
		});
	}
}
