import {
	ClientPermissionsCheck as ClientPermissions,
	type PermissionPreconditionContext,
} from "./builtins/ClientPermissions";
import {
	CooldownCheck as Cooldown,
	type CooldownPreconditionContext,
} from "./builtins/Cooldown";
import { DMOnlyCheck as DMOnly } from "./builtins/DMOnly";
import { EnabledCheck as Enabled } from "./builtins/Enabled";
import { GuildNewsOnlyCheck as GuildNewsOnly } from "./builtins/GuildNewsOnly";
import { GuildNewsThreadOnlyCheck as GuildNewsThreadOnly } from "./builtins/GuildNewsThreadOnly";
import { GuildOnlyCheck as GuildOnly } from "./builtins/GuildOnly";
import { GuildPrivateThreadOnlyCheck as GuildPrivateThreadOnly } from "./builtins/GuildPrivateThreadOnly";
import { GuildPublicThreadOnlyCheck as GuildPublicThreadOnly } from "./builtins/GuildPublicThreadOnly";
import { GuildTextOnlyCheck as GuildTextOnly } from "./builtins/GuildTextOnly";
import { GuildThreadOnlyCheck as GuildThreadOnly } from "./builtins/GuildThreadOnly";
import { GuildVoiceOnlyCheck as GuildVoiceOnly } from "./builtins/GuildVoiceOnly";
import { NSFWCheck as NSFW } from "./builtins/NSFW";
import { RunInCheck as RunIn } from "./builtins/RunIn";
import { UserPermissionsCheck as UserPermissions } from "./builtins/UserPermissions";
export const CorePreconditions = {
	ClientPermissions,
	Cooldown,
	/** @deprecated Use {@link RunIn} instead. */
	DMOnly,
	Enabled,
	RunIn,
	/** @deprecated Use {@link RunIn} instead. */
	GuildNewsOnly,
	/** @deprecated Use {@link RunIn} instead. */
	GuildNewsThreadOnly,
	/** @deprecated Use {@link RunIn} instead. */
	GuildOnly,
	/** @deprecated Use {@link RunIn} instead. */
	GuildPrivateThreadOnly,
	/** @deprecated Use {@link RunIn} instead. */
	GuildPublicThreadOnly,
	/** @deprecated Use {@link RunIn} instead. */
	GuildTextOnly,
	/** @deprecated Use {@link RunIn} instead. */
	GuildVoiceOnly,
	/** @deprecated Use {@link RunIn} instead. */
	GuildThreadOnly,
	NSFW,
	UserPermissions,
};

export namespace CorePreconditions {
	export type UserPermissionsPreconditionContext =
		PermissionPreconditionContext;
	export type CooldownContext = CooldownPreconditionContext;
}
