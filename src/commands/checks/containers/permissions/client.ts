import { type PermissionResolvable, PermissionsBitField } from "discord.js";
import type { PreconditionSingleResolvableDetails } from "../Entry";

/** Create a contextful permissions precondition requirement. */
export class ClientPermissionsPrecondition implements PreconditionSingleResolvableDetails<"ClientPermissions"> {
	public name: "ClientPermissions";
	public context: { permissions: PermissionsBitField };

	/** Create a precondition container entry. */
	public constructor(permissions: PermissionResolvable) {
		this.name = "ClientPermissions";
		this.context = {
			permissions: new PermissionsBitField(permissions),
		};
	}
}
