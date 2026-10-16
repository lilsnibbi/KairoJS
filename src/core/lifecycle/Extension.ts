import type { Awaitable } from "../../utilities/index";
import type { KairoClient } from "../client/KairoClient";

/** An optional client feature. Select extensions on each client. */
export abstract class Extension {
	/** Set this when a hook failure leaves your application unable to operate. */
	static readonly critical: boolean = false;
	/** Register modules and services. This hook is synchronous. */
	static setup(_client: KairoClient): void {}
	/** Prepare services after modules load, before Discord connects. */
	static beforeLogin(_client: KairoClient): Awaitable<void> {}
	/** Start work that needs a connected client. */
	static afterLogin(_client: KairoClient): Awaitable<void> {}
}
