import {
	type AutocompleteInteraction,
	ChannelType,
	ChatInputCommandInteraction,
	ContextMenuCommandInteraction,
	type PermissionResolvable,
	type Snowflake
} from 'discord.js';
import { AliasModule, type AliasModuleJSON } from '../core/modules/index';
import type { Nullish } from '../utilities/index';
import { type FlagStrategyOptions } from '../utilities/parsing/strategies/FlagUnorderedStrategy';
import type { Command } from './Command';
import { PreconditionContainerArray, type PreconditionEntryResolvable } from './checks/containers/Group';
import { BucketScope, CommandOptionsRunTypeEnum } from './enums';
import type { ApplicationCommandRegistry } from './registration/Registry';

export type DetailedDescriptionCommand = string | DetailedDescriptionCommandObject;

export interface DetailedDescriptionCommandObject {}

/** The allowed values for {@link CommandOptions.runIn}. */
export type CommandOptionsRunType =
	| 'DM'
	| 'GUILD_TEXT'
	| 'GUILD_VOICE'
	| 'GUILD_NEWS'
	| 'GUILD_NEWS_THREAD'
	| 'GUILD_PUBLIC_THREAD'
	| 'GUILD_PRIVATE_THREAD'
	| 'GUILD_ANY';

/** The allowed values for {@link CommandOptions.runIn}. */
export type CommandRunInUnion =
	| ChannelType
	| Command.RunInTypes
	| CommandOptionsRunTypeEnum
	| readonly (ChannelType | Command.RunInTypes | CommandOptionsRunTypeEnum)[]
	| Nullish;

/** A more detailed structure for {@link CommandOptions.runIn} when you want to have a different `runIn` for each command type. */
export interface CommandSpecificRunIn {
	chatInputRun?: CommandRunInUnion;
	messageRun?: CommandRunInUnion;
	contextMenuRun?: CommandRunInUnion;
}

/** The {@link Command} options. */
export interface CommandOptions extends AliasModule.Options, FlagStrategyOptions {
	/** Whether to add aliases for commands with dashes in them
	 * @default false */
	generateDashLessAliases?: boolean;

	/** Whether to add aliases for commands with underscores in them
	 * @default false */
	generateUnderscoreLessAliases?: boolean;

	/** The description for the command.
	 * @default '' */
	description?: string;

	/** The detailed description for the command.
	 * @default '' */
	detailedDescription?: DetailedDescriptionCommand;

	/** The full category path for the command
	 * @default 'An array of folder names that lead back to the folder that is registered for in the commands store' */
	fullCategory?: string[];

	/** The {@link Precondition}s to be run, accepts an array of their names. @seealso {@link PreconditionContainerArray}
	 * @default [] */
	preconditions?: readonly PreconditionEntryResolvable[];

	/** The quotes accepted by this command, pass `[]` to disable them.
	 * @default */
	quotes?: [string, string][];

	/** Set whether the command should be treated as NSFW. If set to true, the `NSFW` precondition will be added to the list.
	 * @default false */
	nsfw?: boolean;

	/** The number of entries the cooldown can have before filling up, if set to a non-zero value alongside {@link CommandOptions.cooldownDelay}, the `Cooldown` precondition will be added to the list.
	 * @default 1 */
	cooldownLimit?: number;

	/** The time in milliseconds for the cooldown entries to reset, if set to a non-zero value alongside {@link CommandOptions.cooldownLimit}, the `Cooldown` precondition will be added to the list.
	 * @default 0 */
	cooldownDelay?: number;

	/** The scope of the cooldown entries.
	 * @default BucketScope.User */
	cooldownScope?: BucketScope;

	/** The users that are exempt from the Cooldown precondition. Use this to filter out someone like a bot owner
	 * @default undefined */
	cooldownFilteredUsers?: Snowflake[];

	/** The required permissions for the client.
	 * @default 0 */
	requiredClientPermissions?: PermissionResolvable;

	/** The required permissions for the user.
	 * @default 0 */
	requiredUserPermissions?: PermissionResolvable;

	/** The channels the command should run in.
	 * @default null */
	runIn?: CommandRunInUnion | CommandSpecificRunIn;

	/** If {@link KairoClient.typing} is true, this option will override it. Otherwise, this option has no effect - you may call {@link Channel#sendTyping}` in the run method if you want specific commands to display the typing status.
	 * @default true */
	typing?: boolean;
}

export interface MessageCommandContext extends Record<PropertyKey, unknown> {
	/** The prefix used to run this command.  This is a string for the mention and default prefix, and a RegExp for the `regexPrefix`. */
	prefix: string | RegExp;
	/** The alias used to run this command. */
	commandName: string;
	/** The matched prefix, this will always be the same as {@link MessageCommand.RunContext.prefix} if it was a string, otherwise it is the result of doing `prefix.exec(content)[0]`. */
	commandPrefix: string;
}

export interface ChatInputCommandContext extends Record<PropertyKey, unknown> {
	/** The name of the command. */
	commandName: string;
	/** The id of the command. */
	commandId: string;
}

export interface ContextMenuCommandContext extends Record<PropertyKey, unknown> {
	/** The name of the command. */
	commandName: string;
	/** The id of the command. */
	commandId: string;
}

export interface AutocompleteCommandContext extends Record<PropertyKey, unknown> {
	/** The name of the command. */
	commandName: string;
	/** The id of the command. */
	commandId: string;
}

export interface CommandJSON extends AliasModuleJSON {
	description: string;
	detailedDescription: DetailedDescriptionCommand;
	category: string | null;
}

export type AutocompleteCommand = Command & Required<Pick<Command, 'autocompleteRun'>>;

export namespace AutocompleteCommand {
	export type Options = Command.Options;
	export type JSON = Command.JSON;
	export type Context = Command.Context;
	export type RunInTypes = CommandOptionsRunType;
	export type RunContext = AutocompleteCommandContext;
	export type Interaction<Cached extends import('discord.js').CacheType = import('discord.js').CacheType> = AutocompleteInteraction<Cached>;
	export type Registry = ApplicationCommandRegistry;
}

export type ContextMenuCommand = Command & Required<Pick<Command, 'contextMenuRun'>>;

export namespace ContextMenuCommand {
	export type Options = Command.Options;
	export type JSON = Command.JSON;
	export type Context = Command.Context;
	export type RunInTypes = CommandOptionsRunType;
	export type RunContext = ContextMenuCommandContext;
	export type Interaction<Cached extends import('discord.js').CacheType = import('discord.js').CacheType> =
		ContextMenuCommandInteraction<Cached>;
	export type Registry = ApplicationCommandRegistry;
}

export type MessageCommand = Command & Required<Pick<Command, 'messageRun'>>;

export namespace MessageCommand {
	export type Options = Command.Options;
	export type JSON = Command.JSON;
	export type Context = Command.Context;
	export type RunInTypes = CommandOptionsRunType;
	export type RunContext = MessageCommandContext;
}

export type ChatInputCommand = Command & Required<Pick<Command, 'chatInputRun'>>;

export namespace ChatInputCommand {
	export type Options = Command.Options;
	export type JSON = Command.JSON;
	export type Context = Command.Context;
	export type RunInTypes = CommandOptionsRunType;
	export type RunContext = ChatInputCommandContext;
	export type Interaction<Cached extends import('discord.js').CacheType = import('discord.js').CacheType> =
		ChatInputCommandInteraction<Cached>;
	export type Registry = ApplicationCommandRegistry;
}
