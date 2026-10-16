import { type PermissionResolvable, PermissionsBitField } from "discord.js";
import type { PreconditionSingleResolvableDetails } from "../Entry";

/** Create a contextful permissions precondition requirement. */
export class UserPermissionsPrecondition implements PreconditionSingleResolvableDetails<"UserPermissions"> {
	public name: "UserPermissions";
	public context: { permissions: PermissionsBitField };

	/** Create a precondition container entry. */
	public constructor(permissions: PermissionResolvable) {
		this.name = "UserPermissions";
		this.context = {
			permissions: new PermissionsBitField(permissions),
		};
	}
}
