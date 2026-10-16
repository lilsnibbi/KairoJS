import { ModuleStore } from "../../core/modules/index";
import { Service } from "./Service";

export class ServiceStore extends ModuleStore<Service, "services"> {
	public constructor() {
		super(Service, { name: "services" });
	}
}
