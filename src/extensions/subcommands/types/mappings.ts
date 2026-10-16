import { type Command } from "../../../commands/Command";

export type SubcommandMapping =
	SubcommandMappingMethod | SubcommandMappingGroup;

export type SubcommandMappingArray = SubcommandMapping[];

/** Describes the mapping of all the subcommands to their respective implementations for this command. */
interface SubcommandMappingBase {
	/** The name of this subcommand, or subcommand group */
	name: string;
	/** Whether this subcommand mapping describes a `'method'` or `'group'`
	 * @default 'method' */
	type?: "group" | "method";
}

/** Describes how a subcommand method maps to the actual implementation of that subcommand. */
export interface SubcommandMappingMethod
	extends
		SubcommandMappingBase,
		Pick<
			Command.Options,
			| "preconditions"
			// The following are shortcuts that expand to preconditions
			| "runIn"
			| "nsfw"
			| "cooldownLimit"
			| "cooldownDelay"
			| "cooldownScope"
			| "cooldownFilteredUsers"
			| "requiredClientPermissions"
			| "requiredUserPermissions"
		> {
	/** This subcommand mapping describes a subcommand method and can therefore only ever be `'method'` */
	type?: "method";
	/** Whether this is the default subcommand when none is provided. */
	default?: boolean;
	/** The class method to call when invoking this subcommand through a **message command**, or a callback implementation of the subcommand. */
	messageRun?: string | Command["messageRun"];
	/** The class method to call when invoking this subcommand through a **chat input command**, or a callback implementation of the subcommand. */
	chatInputRun?: string | Command["chatInputRun"];
}

export interface SubcommandMappingGroup extends SubcommandMappingBase {
	/** This subcommand mapping describes a subcommand group and can therefore only ever be `'group'` */
	type: "group";
	/** The {@link SubcommandMappingMethod}s that are contained within this subcommand group. */
	entries: SubcommandMappingMethod[];
}

// Type aliases
export type MessageSubcommandMappingMethod = Omit<
	SubcommandMappingMethod,
	"messageRun"
> &
	Required<Pick<SubcommandMappingMethod, "messageRun">>;

export type ChatInputCommandSubcommandMappingMethod = Omit<
	SubcommandMappingMethod,
	"chatInputRun"
> &
	Required<Pick<SubcommandMappingMethod, "chatInputRun">>;
