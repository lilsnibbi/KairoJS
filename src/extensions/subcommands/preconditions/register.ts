import { container } from "../../../core/modules/index";
import { SubcommandCooldownCheck as SubcommandCooldown } from "./SubcommandCooldown";

export function loadPreconditions() {
	const store = "preconditions" as const;
	void container.modules.addModule({
		name: "SubcommandCooldown",
		module: SubcommandCooldown,
		store,
	});
}
