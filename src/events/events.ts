import {
	type AutocompleteInteraction,
	type ChatInputCommandInteraction,
	type Collection,
	type ContextMenuCommandInteraction,
	Events as DJSEvents,
	type Interaction,
	type Message,
	type Snowflake
} from 'discord.js';
import type { Command } from '../commands/Command';
import type { UserError } from '../commands/errors/UserError';
import type { ApplicationCommandRegistry } from '../commands/registration/Registry';
import type {
	AutocompleteCommand,
	AutocompleteCommandContext,
	ChatInputCommand,
	ChatInputCommandContext,
	ContextMenuCommand,
	ContextMenuCommandContext,
	MessageCommand
} from '../commands/types';
import type { Module, ModuleStore } from '../core/modules/index';
import type { Option } from '../utilities/result/index';
import type { InteractionHandler } from './interactions/interactionHandler';
import type { Listener } from './listener';

export const Events = {
	// #region Discord.js base events
	ApplicationCommandPermissionsUpdate: DJSEvents.ApplicationCommandPermissionsUpdate as const,
	AutoModerationActionExecution: DJSEvents.AutoModerationActionExecution as const,
	AutoModerationRuleCreate: DJSEvents.AutoModerationRuleCreate as const,
	AutoModerationRuleDelete: DJSEvents.AutoModerationRuleDelete as const,
	AutoModerationRuleUpdate: DJSEvents.AutoModerationRuleUpdate as const,
	CacheSweep: DJSEvents.CacheSweep as const,
	ChannelCreate: DJSEvents.ChannelCreate as const,
	ChannelDelete: DJSEvents.ChannelDelete as const,
	ChannelPinsUpdate: DJSEvents.ChannelPinsUpdate as const,
	ChannelUpdate: DJSEvents.ChannelUpdate as const,
	ClientReady: DJSEvents.ClientReady as const,
	Debug: DJSEvents.Debug as const,
	Error: DJSEvents.Error as const,
	GuildAuditLogEntryCreate: DJSEvents.GuildAuditLogEntryCreate as const,
	GuildAvailable: DJSEvents.GuildAvailable as const,
	GuildBanAdd: DJSEvents.GuildBanAdd as const,
	GuildBanRemove: DJSEvents.GuildBanRemove as const,
	GuildCreate: DJSEvents.GuildCreate as const,
	GuildDelete: DJSEvents.GuildDelete as const,
	GuildEmojiCreate: DJSEvents.GuildEmojiCreate as const,
	GuildEmojiDelete: DJSEvents.GuildEmojiDelete as const,
	GuildEmojiUpdate: DJSEvents.GuildEmojiUpdate as const,
	GuildIntegrationsUpdate: DJSEvents.GuildIntegrationsUpdate as const,
	GuildMemberAdd: DJSEvents.GuildMemberAdd as const,
	GuildMemberAvailable: DJSEvents.GuildMemberAvailable as const,
	GuildMemberRemove: DJSEvents.GuildMemberRemove as const,
	GuildMembersChunk: DJSEvents.GuildMembersChunk as const,
	GuildMemberUpdate: DJSEvents.GuildMemberUpdate as const,
	GuildRoleCreate: DJSEvents.GuildRoleCreate as const,
	GuildRoleDelete: DJSEvents.GuildRoleDelete as const,
	GuildRoleUpdate: DJSEvents.GuildRoleUpdate as const,
	GuildScheduledEventCreate: DJSEvents.GuildScheduledEventCreate as const,
	GuildScheduledEventDelete: DJSEvents.GuildScheduledEventDelete as const,
	GuildScheduledEventUpdate: DJSEvents.GuildScheduledEventUpdate as const,
	GuildScheduledEventUserAdd: DJSEvents.GuildScheduledEventUserAdd as const,
	GuildScheduledEventUserRemove: DJSEvents.GuildScheduledEventUserRemove as const,
	GuildStickerCreate: DJSEvents.GuildStickerCreate as const,
	GuildStickerDelete: DJSEvents.GuildStickerDelete as const,
	GuildStickerUpdate: DJSEvents.GuildStickerUpdate as const,
	GuildUnavailable: DJSEvents.GuildUnavailable as const,
	GuildUpdate: DJSEvents.GuildUpdate as const,
	InteractionCreate: DJSEvents.InteractionCreate as const,
	Invalidated: DJSEvents.Invalidated as const,
	InviteCreate: DJSEvents.InviteCreate as const,
	InviteDelete: DJSEvents.InviteDelete as const,
	MessageBulkDelete: DJSEvents.MessageBulkDelete as const,
	MessageCreate: DJSEvents.MessageCreate as const,
	MessageDelete: DJSEvents.MessageDelete as const,
	MessageReactionAdd: DJSEvents.MessageReactionAdd as const,
	MessageReactionRemove: DJSEvents.MessageReactionRemove as const,
	MessageReactionRemoveAll: DJSEvents.MessageReactionRemoveAll as const,
	MessageReactionRemoveEmoji: DJSEvents.MessageReactionRemoveEmoji as const,
	MessageUpdate: DJSEvents.MessageUpdate as const,
	PresenceUpdate: DJSEvents.PresenceUpdate as const,
	Raw: DJSEvents.Raw as const,
	ShardDisconnect: DJSEvents.ShardDisconnect as const,
	ShardError: DJSEvents.ShardError as const,
	ShardReady: DJSEvents.ShardReady as const,
	ShardReconnecting: DJSEvents.ShardReconnecting as const,
	ShardResume: DJSEvents.ShardResume as const,
	StageInstanceCreate: DJSEvents.StageInstanceCreate as const,
	StageInstanceDelete: DJSEvents.StageInstanceDelete as const,
	StageInstanceUpdate: DJSEvents.StageInstanceUpdate as const,
	ThreadCreate: DJSEvents.ThreadCreate as const,
	ThreadDelete: DJSEvents.ThreadDelete as const,
	ThreadListSync: DJSEvents.ThreadListSync as const,
	ThreadMembersUpdate: DJSEvents.ThreadMembersUpdate as const,
	ThreadMemberUpdate: DJSEvents.ThreadMemberUpdate as const,
	ThreadUpdate: DJSEvents.ThreadUpdate as const,
	TypingStart: DJSEvents.TypingStart as const,
	UserUpdate: DJSEvents.UserUpdate as const,
	VoiceServerUpdate: DJSEvents.VoiceServerUpdate as const,
	VoiceStateUpdate: DJSEvents.VoiceStateUpdate as const,
	Warn: DJSEvents.Warn as const,
	WebhooksUpdate: DJSEvents.WebhooksUpdate as const,
	// #endregion Discord.js base events

	// #region KairoJS events
	// Message commands chain
	/** Emitted when a message is created that was not sent by bots or webhooks. */
	PreMessageParsed: 'preMessageParsed' as const,
	/** Emitted when a message is created consisting of only the bot's mention. */
	MentionPrefixOnly: 'mentionPrefixOnly' as const,
	/** Emitted when a message is created that does not start with a valid prefix. */
	NonPrefixedMessage: 'nonPrefixedMessage' as const,
	/** Emitted when a message is created that does starts with a valid prefix. */
	PrefixedMessage: 'prefixedMessage' as const,

	/** Emitted when a message starts with a valid prefix but does not include a command name. */
	UnknownMessageCommandName: 'unknownMessageCommandName' as const,
	/** Emitted when the name of a sent message command does not match any loaded commands. */
	UnknownMessageCommand: 'unknownMessageCommand' as const,
	/** Emitted when a message command is executed but a `messageRun` method is not found. */
	CommandDoesNotHaveMessageCommandHandler: 'commandDoesNotHaveMessageCommandHandler' as const,
	/** Emitted before the `messageRun` method of a command is run. */
	PreMessageCommandRun: 'preMessageCommandRun' as const,

	/** Emitted when a precondition denies a message command from being run. */
	MessageCommandDenied: 'messageCommandDenied' as const,
	/** Emitted when a message command passes all precondition checks, if any. */
	MessageCommandAccepted: 'messageCommandAccepted' as const,

	/** Emitted directly before a message command is run. */
	MessageCommandRun: 'messageCommandRun' as const,
	/** Emitted after a message command runs successfully. */
	MessageCommandSuccess: 'messageCommandSuccess' as const,
	/** Emitted after a message command runs unsuccesfully. */
	MessageCommandError: 'messageCommandError' as const,
	/** Emitted directly after a message command finished running, regardless of the outcome. */
	MessageCommandFinish: 'messageCommandFinish' as const,

	/** Emitted after the bot unsuccessfully tried to start typing when a command is executed. */
	MessageCommandTypingError: 'messageCommandTypingError' as const,

	// Listener errors
	/** Emitted when an error is encountered when executing a listener. */
	ListenerError: 'listenerError' as const,

	// Registry errors
	/** Emitted when an error is encountered when handling the command application command registry. */
	CommandApplicationCommandRegistryError: 'commandApplicationCommandRegistryError' as const,

	/** Emitted when the application command registries are being initialized. */
	ApplicationCommandRegistriesInitialising: 'applicationCommandRegistriesInitialising' as const,

	/** Emitted once the application command registries have been initialized. */
	ApplicationCommandRegistriesRegistered: 'applicationCommandRegistriesRegistered' as const,

	/** Emitted when handling the command registries in bulk overwrite mode. */
	ApplicationCommandRegistriesBulkOverwrite: 'applicationCommandRegistriesBulkOverwrite' as const,

	/** Emitted when an error is encountered when handling the command registries in bulk overwrite mode. */
	ApplicationCommandRegistriesBulkOverwriteError: 'applicationCommandRegistriesBulkOverwriteError' as const,

	// Module store?
	/** Emitted after a module is loaded. */
	ModuleLoaded: 'moduleLoaded' as const,
	/** Emitted when a module is unloaded. */
	ModuleUnloaded: 'moduleUnloaded' as const,

	// Plugin
	/** Emitted when a plugin is loaded. */
	ExtensionLoaded: 'extensionLoaded' as const,

	// Interaction handlers
	/** Emitted when the `parse` method of an interaction handler passes successfully (no errors are encountered) Use the {@link option} parameter to determine if `some` or `none` was passed. */
	InteractionHandlerParseSuccess: 'interactionHandlerParseSuccess' as const,
	/** Emitted when the `parse` method of an interaction handler passes successfully (no errors are encountered) and `some` is returned. */
	InteractionHandlerParseSome: 'interactionHandlerParseSome' as const,
	/** Emitted when the `parse` method of an interaction handler passes successfully (no errors are encountered) and `none` is returned. */
	InteractionHandlerParseNone: 'interactionHandlerParseNone' as const,
	/** Emitted when the `parse` method of an interaction handler encounters an error. */
	InteractionHandlerParseError: 'interactionHandlerParseError' as const,
	/** Emitted when an error is encountered when executing an interaction handler. */
	InteractionHandlerError: 'interactionHandlerError' as const,

	// Autocomplete interaction
	/** Emitted when an autocomplete interaction is recieved. */
	PossibleAutocompleteInteraction: 'possibleAutocompleteInteraction' as const,
	/** Emitted after an autocomplete interaction handler runs successfully. */
	CommandAutocompleteInteractionSuccess: 'commandAutocompleteInteractionSuccess' as const,
	/** Emitted when an error is encountered when executing an autocomplete interaction handler. */
	CommandAutocompleteInteractionError: 'commandAutocompleteInteractionError' as const,

	// Chat input command chain
	/** Emitted when a chat input command interaction is recieved. */
	PossibleChatInputCommand: 'possibleChatInputCommand' as const,
	/** Emitted when the name of a sent chat input command does not match any loaded commands. */
	UnknownChatInputCommand: 'unknownChatInputCommand' as const,
	/** Emitted when a chat input command is executed but a `chatInputRun` method is not found. */
	CommandDoesNotHaveChatInputCommandHandler: 'commandDoesNotHaveChatInputCommandHandler' as const,
	/** Emitted before the `chatInputRun` method of a command is run. */
	PreChatInputCommandRun: 'preChatInputCommandRun' as const,

	/** Emitted when a precondition denies a chat input command from being run. */
	ChatInputCommandDenied: 'chatInputCommandDenied' as const,
	/** Emitted when a chat input command passes all precondition checks, if any. */
	ChatInputCommandAccepted: 'chatInputCommandAccepted' as const,

	/** Emitted directly before a chat input command is run. */
	ChatInputCommandRun: 'chatInputCommandRun' as const,
	/** Emitted after a chat input command runs successfully. */
	ChatInputCommandSuccess: 'chatInputCommandSuccess' as const,
	/** Emitted after a chat input command runs unsuccesfully. */
	ChatInputCommandError: 'chatInputCommandError' as const,
	/** Emitted directly after a chat input command finished running, regardless of the outcome. */
	ChatInputCommandFinish: 'chatInputCommandFinish' as const,

	// Context menu chain
	/** Emitted when a context menu interaction is recieved. */
	PossibleContextMenuCommand: 'possibleContextMenuCommand' as const,
	/** Emitted when the name of a sent context menu command does not match any loaded commands. */
	UnknownContextMenuCommand: 'unknownContextMenuCommand' as const,
	/** Emitted when a chat input command is executed but a `contextMenuRun` method is not found. */
	CommandDoesNotHaveContextMenuCommandHandler: 'commandDoesNotHaveContextMenuCommandHandler' as const,
	/** Emitted before the `contextMenuRun` method of a command is run. */
	PreContextMenuCommandRun: 'preContextMenuCommandRun' as const,

	/** Emitted when a precondition denies a context menu command from being run. */
	ContextMenuCommandDenied: 'contextMenuCommandDenied' as const,
	/** Emitted when a context menu command passes all precondition checks, if any. */
	ContextMenuCommandAccepted: 'contextMenuCommandAccepted' as const,

	/** Emitted directly before a context menu command is run. */
	ContextMenuCommandRun: 'contextMenuCommandRun' as const,
	/** Emitted after a context menu command runs successfully. */
	ContextMenuCommandSuccess: 'contextMenuCommandSuccess' as const,
	/** Emitted after a context menu command runs unsuccesfully. */
	ContextMenuCommandError: 'contextMenuCommandError' as const,
	/** Emitted directly after a context menu command finished running, regardless of the outcome. */
	ContextMenuCommandFinish: 'contextMenuCommandFinish' as const

	// #endregion KairoJS events
} as const;

export interface IPieceError {
	module: Module;
}

export interface ListenerErrorPayload extends IPieceError {
	module: Listener;
}

export interface UnknownMessageCommandNamePayload {
	message: Message;
	prefix: string | RegExp;
	commandPrefix: string;
}

export interface CommandDoesNotHaveMessageCommandHandler {
	message: Message;
	prefix: string | RegExp;
	commandPrefix: string;
	command: Command;
}

export interface UnknownMessageCommandPayload extends UnknownMessageCommandNamePayload {
	commandName: string;
}

export interface IMessageCommandPayload {
	message: Message;
	command: MessageCommand;
}

export interface PreMessageCommandRunPayload extends MessageCommandDeniedPayload {}

export interface MessageCommandDeniedPayload extends IMessageCommandPayload {
	parameters: string;
	context: MessageCommand.RunContext;
}

export interface MessageCommandAcceptedPayload extends IMessageCommandPayload {
	parameters: string;
	context: MessageCommand.RunContext;
}

export interface MessageCommandRunPayload extends MessageCommandAcceptedPayload {
	args: unknown;
}

export interface MessageCommandFinishPayload extends MessageCommandRunPayload {
	success: boolean;
	duration: number;
}

export interface MessageCommandErrorPayload extends MessageCommandRunPayload {
	duration: number;
}

export interface MessageCommandSuccessPayload extends MessageCommandRunPayload {
	result: unknown;
	duration: number;
}

export interface MessageCommandTypingErrorPayload extends MessageCommandRunPayload {}

export interface UnknownChatInputCommandPayload {
	interaction: ChatInputCommandInteraction;
	context: ChatInputCommandContext;
}

export interface CommandDoesNotHaveChatInputCommandHandlerPayload {
	interaction: ChatInputCommandInteraction;
	command: Command;
	context: ChatInputCommandContext;
}

export interface IChatInputCommandPayload {
	interaction: ChatInputCommandInteraction;
	command: ChatInputCommand;
}

export interface PreChatInputCommandRunPayload extends IChatInputCommandPayload {
	context: ChatInputCommandContext;
}

export interface ChatInputCommandDeniedPayload extends IChatInputCommandPayload {
	context: ChatInputCommandContext;
}

export interface ChatInputCommandAcceptedPayload extends PreChatInputCommandRunPayload {}

export interface ChatInputCommandRunPayload extends ChatInputCommandAcceptedPayload {}

export interface ChatInputCommandFinishPayload extends ChatInputCommandAcceptedPayload {
	success: boolean;
	duration: number;
}

export interface ChatInputCommandSuccessPayload extends ChatInputCommandRunPayload {
	result: unknown;
	duration: number;
}

export interface ChatInputCommandErrorPayload extends IChatInputCommandPayload {
	duration: number;
}

export interface UnknownContextMenuCommandPayload {
	interaction: ContextMenuCommandInteraction;
	context: ContextMenuCommandContext;
}

export interface CommandDoesNotHaveContextMenuCommandHandlerPayload {
	interaction: ContextMenuCommandInteraction;
	context: ContextMenuCommandContext;
	command: Command;
}

export interface IContextMenuCommandPayload {
	interaction: ContextMenuCommandInteraction;
	command: ContextMenuCommand;
}

export interface PreContextMenuCommandRunPayload extends IContextMenuCommandPayload {
	context: ContextMenuCommandContext;
}

export interface ContextMenuCommandDeniedPayload extends IContextMenuCommandPayload {
	context: ContextMenuCommandContext;
}

export interface ContextMenuCommandAcceptedPayload extends PreContextMenuCommandRunPayload {}

export interface ContextMenuCommandRunPayload extends ContextMenuCommandAcceptedPayload {}

export interface ContextMenuCommandFinishPayload extends ContextMenuCommandAcceptedPayload {
	success: boolean;
	duration: number;
}

export interface ContextMenuCommandSuccessPayload extends ContextMenuCommandRunPayload {
	result: unknown;
	duration: number;
}

export interface ContextMenuCommandErrorPayload extends IContextMenuCommandPayload {
	duration: number;
}

export interface IInteractionHandlerPayload {
	interaction: Interaction;
	handler: InteractionHandler;
}

export interface InteractionHandlerParseSuccess extends IInteractionHandlerPayload {}

export interface InteractionHandlerParseSome<T = unknown> extends IInteractionHandlerPayload {
	/** The value that was passed to the `some` function. */
	value: T;
}

export interface InteractionHandlerParseNone extends IInteractionHandlerPayload {}

export interface InteractionHandlerParseError extends IInteractionHandlerPayload {}

export interface InteractionHandlerError extends IInteractionHandlerPayload {}

export interface AutocompleteInteractionPayload {
	interaction: AutocompleteInteraction;
	command: AutocompleteCommand;
	context: AutocompleteCommandContext;
}

declare const KairoEvents: typeof Events;

declare module 'discord.js' {
	interface ClientEvents {
		// #region KairoJS load cycle events
		[KairoEvents.ModuleUnloaded]: [store: ModuleStore<Module>, module: Module];
		[KairoEvents.ModuleLoaded]: [store: ModuleStore<Module>, module: Module];

		[KairoEvents.ListenerError]: [error: unknown, payload: ListenerErrorPayload];
		[KairoEvents.CommandApplicationCommandRegistryError]: [error: unknown, command: Command];
		[KairoEvents.ApplicationCommandRegistriesInitialising]: [];
		[KairoEvents.ApplicationCommandRegistriesRegistered]: [registries: Map<string, ApplicationCommandRegistry>, timeTaken: number];
		[KairoEvents.ApplicationCommandRegistriesBulkOverwrite]: [result: Collection<Snowflake, ApplicationCommand>, guildId: string | null];
		[KairoEvents.ApplicationCommandRegistriesBulkOverwriteError]: [error: unknown, guildId: string | null];

		[KairoEvents.PreMessageParsed]: [message: Message];
		[KairoEvents.MentionPrefixOnly]: [message: Message];
		[KairoEvents.NonPrefixedMessage]: [message: Message];
		[KairoEvents.PrefixedMessage]: [message: Message, prefix: string | RegExp];

		[KairoEvents.UnknownMessageCommandName]: [payload: UnknownMessageCommandNamePayload];
		[KairoEvents.UnknownMessageCommand]: [payload: UnknownMessageCommandPayload];
		[KairoEvents.CommandDoesNotHaveMessageCommandHandler]: [payload: CommandDoesNotHaveMessageCommandHandler];
		[KairoEvents.PreMessageCommandRun]: [payload: PreMessageCommandRunPayload];

		[KairoEvents.MessageCommandDenied]: [error: UserError, payload: MessageCommandDeniedPayload];
		[KairoEvents.MessageCommandAccepted]: [payload: MessageCommandAcceptedPayload];

		[KairoEvents.MessageCommandRun]: [message: Message, command: Command, payload: MessageCommandRunPayload];
		[KairoEvents.MessageCommandSuccess]: [payload: MessageCommandSuccessPayload];
		[KairoEvents.MessageCommandError]: [error: unknown, payload: MessageCommandErrorPayload];
		[KairoEvents.MessageCommandFinish]: [message: Message, command: Command, payload: MessageCommandFinishPayload];

		[KairoEvents.MessageCommandTypingError]: [error: Error, payload: MessageCommandTypingErrorPayload];

		[KairoEvents.ExtensionLoaded]: [hook: 'setup' | 'beforeLogin' | 'afterLogin', name: string | undefined];

		[KairoEvents.InteractionHandlerParseSuccess]: [option: Option<unknown>, payload: InteractionHandlerParseSuccess];
		[KairoEvents.InteractionHandlerParseSome]: [option: Option.Some<unknown>, payload: InteractionHandlerParseSome];
		[KairoEvents.InteractionHandlerParseNone]: [option: Option.None, payload: InteractionHandlerParseNone];
		[KairoEvents.InteractionHandlerParseError]: [error: unknown, payload: InteractionHandlerParseError];
		[KairoEvents.InteractionHandlerError]: [error: unknown, payload: InteractionHandlerError];

		[KairoEvents.PossibleAutocompleteInteraction]: [interaction: AutocompleteInteraction];
		[KairoEvents.CommandAutocompleteInteractionError]: [error: unknown, payload: AutocompleteInteractionPayload];
		[KairoEvents.CommandAutocompleteInteractionSuccess]: [payload: AutocompleteInteractionPayload];

		// Chat input command chain
		[KairoEvents.PossibleChatInputCommand]: [interaction: ChatInputCommandInteraction];
		[KairoEvents.UnknownChatInputCommand]: [payload: UnknownChatInputCommandPayload];
		[KairoEvents.CommandDoesNotHaveChatInputCommandHandler]: [payload: CommandDoesNotHaveChatInputCommandHandlerPayload];
		[KairoEvents.PreChatInputCommandRun]: [payload: PreChatInputCommandRunPayload];

		[KairoEvents.ChatInputCommandDenied]: [error: UserError, payload: ChatInputCommandDeniedPayload];
		[KairoEvents.ChatInputCommandAccepted]: [payload: ChatInputCommandAcceptedPayload];

		[KairoEvents.ChatInputCommandRun]: [
			interaction: ChatInputCommandInteraction,
			command: ChatInputCommand,
			payload: ChatInputCommandRunPayload
		];
		[KairoEvents.ChatInputCommandSuccess]: [payload: ChatInputCommandSuccessPayload];
		[KairoEvents.ChatInputCommandError]: [error: unknown, payload: ChatInputCommandErrorPayload];
		[KairoEvents.ChatInputCommandFinish]: [
			interaction: ChatInputCommandInteraction,
			command: ChatInputCommand,
			payload: ChatInputCommandFinishPayload
		];

		// Context menu command chain
		[KairoEvents.PossibleContextMenuCommand]: [interaction: ContextMenuCommandInteraction];
		[KairoEvents.UnknownContextMenuCommand]: [payload: UnknownContextMenuCommandPayload];
		[KairoEvents.CommandDoesNotHaveContextMenuCommandHandler]: [payload: CommandDoesNotHaveContextMenuCommandHandlerPayload];
		[KairoEvents.PreContextMenuCommandRun]: [payload: PreContextMenuCommandRunPayload];

		[KairoEvents.ContextMenuCommandDenied]: [error: UserError, payload: ContextMenuCommandDeniedPayload];
		[KairoEvents.ContextMenuCommandAccepted]: [payload: ContextMenuCommandAcceptedPayload];

		[KairoEvents.ContextMenuCommandRun]: [
			interaction: ContextMenuCommandInteraction,
			command: ContextMenuCommand,
			payload: ContextMenuCommandRunPayload
		];
		[KairoEvents.ContextMenuCommandSuccess]: [payload: ContextMenuCommandSuccessPayload];
		[KairoEvents.ContextMenuCommandError]: [error: unknown, payload: ContextMenuCommandErrorPayload];
		[KairoEvents.ContextMenuCommandFinish]: [
			interaction: ContextMenuCommandInteraction,
			command: ContextMenuCommand,
			payload: ContextMenuCommandFinishPayload
		];

		// #endregion KairoJS load cycle events

		// #region Termination
		[K: string]: unknown[];
		// #endregion Termination
	}
}
