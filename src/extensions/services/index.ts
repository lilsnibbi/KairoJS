import type { Services } from "./Services";

export * from "./Service";
export * from "./ServiceStore";
export * from "./Services";

/** Add the services extension property to discord.js client types. */
declare module "discord.js" {
	/** Client services supplied by ServicesExtension. */
	export interface Client {
		/** Service lookup available while the services extension is enabled. */
		services: Services;
	}
}
