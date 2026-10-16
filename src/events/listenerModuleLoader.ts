import { ModuleLoader } from "../core/modules/index";
import type { Listener } from "./listener";
import type { ListenerStore } from "./listenerStore";

export class ListenerModuleLoader extends ModuleLoader<Listener> {
	public override onLoad(_store: ListenerStore, module: Listener) {
		const listenerCallback = module["_listener"];
		if (listenerCallback) {
			const emitter = module.emitter!;

			// Increment the maximum amount of listeners by one:
			const maxListeners = emitter.getMaxListeners();
			if (maxListeners !== 0) emitter.setMaxListeners(maxListeners + 1);

			emitter[module.once ? "once" : "on"](module.event, listenerCallback);
		}
	}

	public override onUnload(_store: ListenerStore, module: Listener) {
		const listenerCallback = module["_listener"];
		if (listenerCallback) {
			const emitter = module.emitter!;

			// Increment the maximum amount of listeners by one:
			const maxListeners = emitter.getMaxListeners();
			if (maxListeners !== 0) emitter.setMaxListeners(maxListeners - 1);

			emitter.off(module.event, listenerCallback);
		}
	}
}
