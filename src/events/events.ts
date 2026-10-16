import {
	type AutocompleteInteraction,
	type ChatInputCommandInteraction,
	type Collection,
	type ContextMenuCommandInteraction,
	Events as DJSEvents,
	type Interaction,
	type Message,
	type Snowflake,
} from "discord.js";
import type { PreconditionContext } from "../commands/checks/Precondition";
import type { Command } from "../commands/Command";
import type { UserError } from "../commands/errors/UserError";
import type { ApplicationCommandRegistry } from "../commands/registration/Registry";
import type {
	AutocompleteCommand,
	AutocompleteCommandContext,
	ChatInputCommand,
	ChatInputCommandContext,
	ContextMenuCommand,
	ContextMenuCommandContext,
	MessageCommand,
} from "../commands/types";
import type { Module, ModuleStore } from "../core/modules/index";
import type { Option } from "../utilities/result/index";
import type { InteractionHandler } from "./interactions/interactionHandler";
import type { Listener } from "./listener";

/** Discord and KairoJS event names. ClientEvents supplies each event’s argument tuple. */
export const Events = {
	// #region Discord.js base events
	/** Alias of the discord.js ApplicationCommandPermissionsUpdate event. Its payload follows discord.js ClientEvents. */
	ApplicationCommandPermissionsUpdate:
		DJSEvents.ApplicationCommandPermissionsUpdate as const,
	/** Alias of the discord.js AutoModerationActionExecution event. Its payload follows discord.js ClientEvents. */
	AutoModerationActionExecution:
		DJSEvents.AutoModerationActionExecution as const,
	/** Alias of the discord.js AutoModerationRuleCreate event. Its payload follows discord.js ClientEvents. */
	AutoModerationRuleCreate: DJSEvents.AutoModerationRuleCreate as const,
	/** Alias of the discord.js AutoModerationRuleDelete event. Its payload follows discord.js ClientEvents. */
	AutoModerationRuleDelete: DJSEvents.AutoModerationRuleDelete as const,
	/** Alias of the discord.js AutoModerationRuleUpdate event. Its payload follows discord.js ClientEvents. */
	AutoModerationRuleUpdate: DJSEvents.AutoModerationRuleUpdate as const,
	/** Alias of the discord.js CacheSweep event. Its payload follows discord.js ClientEvents. */
	CacheSweep: DJSEvents.CacheSweep as const,
	/** Alias of the discord.js ChannelCreate event. Its payload follows discord.js ClientEvents. */
	ChannelCreate: DJSEvents.ChannelCreate as const,
	/** Alias of the discord.js ChannelDelete event. Its payload follows discord.js ClientEvents. */
	ChannelDelete: DJSEvents.ChannelDelete as const,
	/** Alias of the discord.js ChannelPinsUpdate event. Its payload follows discord.js ClientEvents. */
	ChannelPinsUpdate: DJSEvents.ChannelPinsUpdate as const,
	/** Alias of the discord.js ChannelUpdate event. Its payload follows discord.js ClientEvents. */
	ChannelUpdate: DJSEvents.ChannelUpdate as const,
	/** Alias of the discord.js ClientReady event. Its payload follows discord.js ClientEvents. */
	ClientReady: DJSEvents.ClientReady as const,
	/** Alias of the discord.js Debug event. Its payload follows discord.js ClientEvents. */
	Debug: DJSEvents.Debug as const,
	/** Alias of the discord.js Error event. Its payload follows discord.js ClientEvents. */
	Error: DJSEvents.Error as const,
	/** Alias of the discord.js GuildAuditLogEntryCreate event. Its payload follows discord.js ClientEvents. */
	GuildAuditLogEntryCreate: DJSEvents.GuildAuditLogEntryCreate as const,
	/** Alias of the discord.js GuildAvailable event. Its payload follows discord.js ClientEvents. */
	GuildAvailable: DJSEvents.GuildAvailable as const,
	/** Alias of the discord.js GuildBanAdd event. Its payload follows discord.js ClientEvents. */
	GuildBanAdd: DJSEvents.GuildBanAdd as const,
	/** Alias of the discord.js GuildBanRemove event. Its payload follows discord.js ClientEvents. */
	GuildBanRemove: DJSEvents.GuildBanRemove as const,
	/** Alias of the discord.js GuildCreate event. Its payload follows discord.js ClientEvents. */
	GuildCreate: DJSEvents.GuildCreate as const,
	/** Alias of the discord.js GuildDelete event. Its payload follows discord.js ClientEvents. */
	GuildDelete: DJSEvents.GuildDelete as const,
	/** Alias of the discord.js GuildEmojiCreate event. Its payload follows discord.js ClientEvents. */
	GuildEmojiCreate: DJSEvents.GuildEmojiCreate as const,
	/** Alias of the discord.js GuildEmojiDelete event. Its payload follows discord.js ClientEvents. */
	GuildEmojiDelete: DJSEvents.GuildEmojiDelete as const,
	/** Alias of the discord.js GuildEmojiUpdate event. Its payload follows discord.js ClientEvents. */
	GuildEmojiUpdate: DJSEvents.GuildEmojiUpdate as const,
	/** Alias of the discord.js GuildIntegrationsUpdate event. Its payload follows discord.js ClientEvents. */
	GuildIntegrationsUpdate: DJSEvents.GuildIntegrationsUpdate as const,
	/** Alias of the discord.js GuildMemberAdd event. Its payload follows discord.js ClientEvents. */
	GuildMemberAdd: DJSEvents.GuildMemberAdd as const,
	/** Alias of the discord.js GuildMemberAvailable event. Its payload follows discord.js ClientEvents. */
	GuildMemberAvailable: DJSEvents.GuildMemberAvailable as const,
	/** Alias of the discord.js GuildMemberRemove event. Its payload follows discord.js ClientEvents. */
	GuildMemberRemove: DJSEvents.GuildMemberRemove as const,
	/** Alias of the discord.js GuildMembersChunk event. Its payload follows discord.js ClientEvents. */
	GuildMembersChunk: DJSEvents.GuildMembersChunk as const,
	/** Alias of the discord.js GuildMemberUpdate event. Its payload follows discord.js ClientEvents. */
	GuildMemberUpdate: DJSEvents.GuildMemberUpdate as const,
	/** Alias of the discord.js GuildRoleCreate event. Its payload follows discord.js ClientEvents. */
	GuildRoleCreate: DJSEvents.GuildRoleCreate as const,
	/** Alias of the discord.js GuildRoleDelete event. Its payload follows discord.js ClientEvents. */
	GuildRoleDelete: DJSEvents.GuildRoleDelete as const,
	/** Alias of the discord.js GuildRoleUpdate event. Its payload follows discord.js ClientEvents. */
	GuildRoleUpdate: DJSEvents.GuildRoleUpdate as const,
	/** Alias of the discord.js GuildScheduledEventCreate event. Its payload follows discord.js ClientEvents. */
	GuildScheduledEventCreate: DJSEvents.GuildScheduledEventCreate as const,
	/** Alias of the discord.js GuildScheduledEventDelete event. Its payload follows discord.js ClientEvents. */
	GuildScheduledEventDelete: DJSEvents.GuildScheduledEventDelete as const,
	/** Alias of the discord.js GuildScheduledEventUpdate event. Its payload follows discord.js ClientEvents. */
	GuildScheduledEventUpdate: DJSEvents.GuildScheduledEventUpdate as const,
	/** Alias of the discord.js GuildScheduledEventUserAdd event. Its payload follows discord.js ClientEvents. */
	GuildScheduledEventUserAdd: DJSEvents.GuildScheduledEventUserAdd as const,
	/** Alias of the discord.js GuildScheduledEventUserRemove event. Its payload follows discord.js ClientEvents. */
	GuildScheduledEventUserRemove:
		DJSEvents.GuildScheduledEventUserRemove as const,
	/** Alias of the discord.js GuildStickerCreate event. Its payload follows discord.js ClientEvents. */
	GuildStickerCreate: DJSEvents.GuildStickerCreate as const,
	/** Alias of the discord.js GuildStickerDelete event. Its payload follows discord.js ClientEvents. */
	GuildStickerDelete: DJSEvents.GuildStickerDelete as const,
	/** Alias of the discord.js GuildStickerUpdate event. Its payload follows discord.js ClientEvents. */
	GuildStickerUpdate: DJSEvents.GuildStickerUpdate as const,
	/** Alias of the discord.js GuildUnavailable event. Its payload follows discord.js ClientEvents. */
	GuildUnavailable: DJSEvents.GuildUnavailable as const,
	/** Alias of the discord.js GuildUpdate event. Its payload follows discord.js ClientEvents. */
	GuildUpdate: DJSEvents.GuildUpdate as const,
	/** Alias of the discord.js InteractionCreate event. Its payload follows discord.js ClientEvents. */
	InteractionCreate: DJSEvents.InteractionCreate as const,
	/** Alias of the discord.js Invalidated event. Its payload follows discord.js ClientEvents. */
	Invalidated: DJSEvents.Invalidated as const,
	/** Alias of the discord.js InviteCreate event. Its payload follows discord.js ClientEvents. */
	InviteCreate: DJSEvents.InviteCreate as const,
	/** Alias of the discord.js InviteDelete event. Its payload follows discord.js ClientEvents. */
	InviteDelete: DJSEvents.InviteDelete as const,
	/** Alias of the discord.js MessageBulkDelete event. Its payload follows discord.js ClientEvents. */
	MessageBulkDelete: DJSEvents.MessageBulkDelete as const,
	/** Alias of the discord.js MessageCreate event. Its payload follows discord.js ClientEvents. */
	MessageCreate: DJSEvents.MessageCreate as const,
	/** Alias of the discord.js MessageDelete event. Its payload follows discord.js ClientEvents. */
	MessageDelete: DJSEvents.MessageDelete as const,
	/** Alias of the discord.js MessageReactionAdd event. Its payload follows discord.js ClientEvents. */
	MessageReactionAdd: DJSEvents.MessageReactionAdd as const,
	/** Alias of the discord.js MessageReactionRemove event. Its payload follows discord.js ClientEvents. */
	MessageReactionRemove: DJSEvents.MessageReactionRemove as const,
	/** Alias of the discord.js MessageReactionRemoveAll event. Its payload follows discord.js ClientEvents. */
	MessageReactionRemoveAll: DJSEvents.MessageReactionRemoveAll as const,
	/** Alias of the discord.js MessageReactionRemoveEmoji event. Its payload follows discord.js ClientEvents. */
	MessageReactionRemoveEmoji: DJSEvents.MessageReactionRemoveEmoji as const,
	/** Alias of the discord.js MessageUpdate event. Its payload follows discord.js ClientEvents. */
	MessageUpdate: DJSEvents.MessageUpdate as const,
	/** Alias of the discord.js PresenceUpdate event. Its payload follows discord.js ClientEvents. */
	PresenceUpdate: DJSEvents.PresenceUpdate as const,
	/** Alias of the discord.js Raw event. Its payload follows discord.js ClientEvents. */
	Raw: DJSEvents.Raw as const,
	/** Alias of the discord.js ShardDisconnect event. Its payload follows discord.js ClientEvents. */
	ShardDisconnect: DJSEvents.ShardDisconnect as const,
	/** Alias of the discord.js ShardError event. Its payload follows discord.js ClientEvents. */
	ShardError: DJSEvents.ShardError as const,
	/** Alias of the discord.js ShardReady event. Its payload follows discord.js ClientEvents. */
	ShardReady: DJSEvents.ShardReady as const,
	/** Alias of the discord.js ShardReconnecting event. Its payload follows discord.js ClientEvents. */
	ShardReconnecting: DJSEvents.ShardReconnecting as const,
	/** Alias of the discord.js ShardResume event. Its payload follows discord.js ClientEvents. */
	ShardResume: DJSEvents.ShardResume as const,
	/** Alias of the discord.js StageInstanceCreate event. Its payload follows discord.js ClientEvents. */
	StageInstanceCreate: DJSEvents.StageInstanceCreate as const,
	/** Alias of the discord.js StageInstanceDelete event. Its payload follows discord.js ClientEvents. */
	StageInstanceDelete: DJSEvents.StageInstanceDelete as const,
	/** Alias of the discord.js StageInstanceUpdate event. Its payload follows discord.js ClientEvents. */
	StageInstanceUpdate: DJSEvents.StageInstanceUpdate as const,
	/** Alias of the discord.js ThreadCreate event. Its payload follows discord.js ClientEvents. */
	ThreadCreate: DJSEvents.ThreadCreate as const,
	/** Alias of the discord.js ThreadDelete event. Its payload follows discord.js ClientEvents. */
	ThreadDelete: DJSEvents.ThreadDelete as const,
	/** Alias of the discord.js ThreadListSync event. Its payload follows discord.js ClientEvents. */
	ThreadListSync: DJSEvents.ThreadListSync as const,
	/** Alias of the discord.js ThreadMembersUpdate event. Its payload follows discord.js ClientEvents. */
	ThreadMembersUpdate: DJSEvents.ThreadMembersUpdate as const,
	/** Alias of the discord.js ThreadMemberUpdate event. Its payload follows discord.js ClientEvents. */
	ThreadMemberUpdate: DJSEvents.ThreadMemberUpdate as const,
	/** Alias of the discord.js ThreadUpdate event. Its payload follows discord.js ClientEvents. */
	ThreadUpdate: DJSEvents.ThreadUpdate as const,
	/** Alias of the discord.js TypingStart event. Its payload follows discord.js ClientEvents. */
	TypingStart: DJSEvents.TypingStart as const,
	/** Alias of the discord.js UserUpdate event. Its payload follows discord.js ClientEvents. */
	UserUpdate: DJSEvents.UserUpdate as const,
	/** Alias of the discord.js VoiceServerUpdate event. Its payload follows discord.js ClientEvents. */
	VoiceServerUpdate: DJSEvents.VoiceServerUpdate as const,
	/** Alias of the discord.js VoiceStateUpdate event. Its payload follows discord.js ClientEvents. */
	VoiceStateUpdate: DJSEvents.VoiceStateUpdate as const,
	/** Alias of the discord.js Warn event. Its payload follows discord.js ClientEvents. */
	Warn: DJSEvents.Warn as const,
	/** Alias of the discord.js WebhooksUpdate event. Its payload follows discord.js ClientEvents. */
	WebhooksUpdate: DJSEvents.WebhooksUpdate as const,
	// #endregion Discord.js base events

	// #region KairoJS events
	// Message commands chain
	/** A non-bot message enters prefix parsing. */
	PreMessageParsed: "preMessageParsed" as const,
	/** A message contains only the bot mention prefix. */
	MentionPrefixOnly: "mentionPrefixOnly" as const,
	/** No configured or mention prefix matched the message. */
	NonPrefixedMessage: "nonPrefixedMessage" as const,
	/** A message prefix matched, before command-name parsing. */
	PrefixedMessage: "prefixedMessage" as const,

	/** No command name followed the matched prefix. */
	UnknownMessageCommandName: "unknownMessageCommandName" as const,
	/** The parsed message command name was not found. */
	UnknownMessageCommand: "unknownMessageCommand" as const,
	/** A matched command has no messageRun handler. */
	CommandDoesNotHaveMessageCommandHandler:
		"commandDoesNotHaveMessageCommandHandler" as const,
	/** A message command is ready for precondition checks. */
	PreMessageCommandRun: "preMessageCommandRun" as const,

	/** Message command preconditions returned a denial. */
	MessageCommandDenied: "messageCommandDenied" as const,
	/** Message command preconditions passed; argument preparation and execution follow. */
	MessageCommandAccepted: "messageCommandAccepted" as const,

	/** A prepared message command is about to run. */
	MessageCommandRun: "messageCommandRun" as const,
	/** A message command resolved successfully; the payload includes its result and duration. */
	MessageCommandSuccess: "messageCommandSuccess" as const,
	/** The message-command run phase threw or rejected. Argument preparation failures are reported through ListenerError. */
	MessageCommandError: "messageCommandError" as const,
	/** A message command attempt finished, with success state and duration. */
	MessageCommandFinish: "messageCommandFinish" as const,

	/** Sending the message command’s typing indicator failed. */
	MessageCommandTypingError: "messageCommandTypingError" as const,

	// Listener errors
	/** A listener’s run method threw or rejected. */
	ListenerError: "listenerError" as const,

	// Registry errors
	/** A command’s application-registration hook failed. */
	CommandApplicationCommandRegistryError:
		"commandApplicationCommandRegistryError" as const,

	/** Application command registration is starting. */
	ApplicationCommandRegistriesInitialising:
		"applicationCommandRegistriesInitialising" as const,

	/** The registration pass completed, with the registry map and elapsed milliseconds. */
	ApplicationCommandRegistriesRegistered:
		"applicationCommandRegistriesRegistered" as const,

	/** One global or guild command list was replaced; a null guild ID means global. */
	ApplicationCommandRegistriesBulkOverwrite:
		"applicationCommandRegistriesBulkOverwrite" as const,

	/** A global or guild bulk overwrite failed; a null guild ID means global. */
	ApplicationCommandRegistriesBulkOverwriteError:
		"applicationCommandRegistriesBulkOverwriteError" as const,

	// Module store?
	/** A module finished activation and entered its store. */
	ModuleLoaded: "moduleLoaded" as const,
	/** A module was removed after successful cleanup. */
	ModuleUnloaded: "moduleUnloaded" as const,

	// Plugin
	/** One extension lifecycle hook completed successfully. */
	ExtensionLoaded: "extensionLoaded" as const,

	// Interaction handlers
	/** An interaction handler’s parse method returned an Option without throwing. */
	InteractionHandlerParseSuccess: "interactionHandlerParseSuccess" as const,
	/** A handler accepted an interaction with Some; its parsed value is included. */
	InteractionHandlerParseSome: "interactionHandlerParseSome" as const,
	/** A handler skipped an interaction with None. */
	InteractionHandlerParseNone: "interactionHandlerParseNone" as const,
	/** A handler’s parse method threw or rejected. */
	InteractionHandlerParseError: "interactionHandlerParseError" as const,
	/** An accepted interaction handler’s run method threw or rejected. */
	InteractionHandlerError: "interactionHandlerError" as const,

	// Autocomplete interaction
	/** An autocomplete interaction enters command lookup. */
	PossibleAutocompleteInteraction: "possibleAutocompleteInteraction" as const,
	/** A command’s autocomplete handler completed successfully. */
	CommandAutocompleteInteractionSuccess:
		"commandAutocompleteInteractionSuccess" as const,
	/** A command’s autocomplete handler threw or rejected. */
	CommandAutocompleteInteractionError:
		"commandAutocompleteInteractionError" as const,

	// Chat input command chain
	/** A slash interaction enters command lookup. */
	PossibleChatInputCommand: "possibleChatInputCommand" as const,
	/** No local command matched the slash interaction. */
	UnknownChatInputCommand: "unknownChatInputCommand" as const,
	/** The matched command has no slash handler. */
	CommandDoesNotHaveChatInputCommandHandler:
		"commandDoesNotHaveChatInputCommandHandler" as const,
	/** A slash command is ready for precondition checks. */
	PreChatInputCommandRun: "preChatInputCommandRun" as const,

	/** The slash command’s preconditions denied the invocation. */
	ChatInputCommandDenied: "chatInputCommandDenied" as const,
	/** The slash command’s preconditions passed. */
	ChatInputCommandAccepted: "chatInputCommandAccepted" as const,

	/** An accepted slash handler is about to run. */
	ChatInputCommandRun: "chatInputCommandRun" as const,
	/** A slash handler completed, with its return value and duration. */
	ChatInputCommandSuccess: "chatInputCommandSuccess" as const,
	/** A slash command attempt threw or rejected. */
	ChatInputCommandError: "chatInputCommandError" as const,
	/** A slash command attempt finished, with success state and duration. */
	ChatInputCommandFinish: "chatInputCommandFinish" as const,

	// Context menu chain
	/** A context-menu interaction enters command lookup. */
	PossibleContextMenuCommand: "possibleContextMenuCommand" as const,
	/** No local command matched the context-menu interaction. */
	UnknownContextMenuCommand: "unknownContextMenuCommand" as const,
	/** The matched command has no context-menu handler. */
	CommandDoesNotHaveContextMenuCommandHandler:
		"commandDoesNotHaveContextMenuCommandHandler" as const,
	/** A context-menu command is ready for precondition checks. */
	PreContextMenuCommandRun: "preContextMenuCommandRun" as const,

	/** The context-menu command’s preconditions denied the invocation. */
	ContextMenuCommandDenied: "contextMenuCommandDenied" as const,
	/** The context-menu command’s preconditions passed. */
	ContextMenuCommandAccepted: "contextMenuCommandAccepted" as const,

	/** An accepted context-menu handler is about to run. */
	ContextMenuCommandRun: "contextMenuCommandRun" as const,
	/** A context-menu handler completed, with its return value and duration. */
	ContextMenuCommandSuccess: "contextMenuCommandSuccess" as const,
	/** A context-menu command attempt threw or rejected. */
	ContextMenuCommandError: "contextMenuCommandError" as const,
	/** A context-menu command attempt finished, with success state and duration. */
	ContextMenuCommandFinish: "contextMenuCommandFinish" as const,

	// #endregion KairoJS events
} as const;

/** Module metadata attached to an error event. */
export interface IPieceError {
	/** Module associated with this event. */
	module: Module;
}

/** Data passed with the listener error event. */
export interface ListenerErrorPayload extends IPieceError {
	/** Module associated with this event. */
	module: Listener;
}

/** Data passed with the unknown message command name event. */
export interface UnknownMessageCommandNamePayload {
	/** Message that triggered this event. */
	message: Message;
	/** Configured string or regex prefix that matched. */
	prefix: string | RegExp;
	/** Exact prefix text matched in the message. */
	commandPrefix: string;
}

/** Data passed with the command does not have message command handler event. */
export interface CommandDoesNotHaveMessageCommandHandler {
	/** Message that triggered this event. */
	message: Message;
	/** Configured string or regex prefix that matched. */
	prefix: string | RegExp;
	/** Exact prefix text matched in the message. */
	commandPrefix: string;
	/** Command associated with this invocation. */
	command: Command;
}

/** Data passed with the unknown message command event. */
export interface UnknownMessageCommandPayload extends UnknownMessageCommandNamePayload {
	/** Parsed command name or alias. */
	commandName: string;
}

/** Message and command shared by message-command events. */
export interface IMessageCommandPayload extends PreconditionContext {
	/** Message that triggered this event. */
	message: Message;
	/** Command associated with this invocation. */
	command: MessageCommand;
}

/** Data passed with the pre message command run event. */
export type PreMessageCommandRunPayload = MessageCommandDeniedPayload;

/** Data passed with the message command denied event. */
export interface MessageCommandDeniedPayload extends IMessageCommandPayload {
	/** Raw text after the command name, before argument parsing. */
	parameters: string;
	/** Invocation metadata passed to the command. */
	context: MessageCommand.RunContext;
}

/** Data passed with the message command accepted event. */
export interface MessageCommandAcceptedPayload extends IMessageCommandPayload {
	/** Raw text after the command name, before argument parsing. */
	parameters: string;
	/** Invocation metadata passed to the command. */
	context: MessageCommand.RunContext;
}

/** Data passed with the message command run event. */
export interface MessageCommandRunPayload extends MessageCommandAcceptedPayload {
	/** Value returned by messagePreParse and passed to messageRun. */
	args: unknown;
}

/** Data passed with the message command finish event. */
export interface MessageCommandFinishPayload extends MessageCommandRunPayload {
	/** Whether the command attempt completed successfully. */
	success: boolean;
	/** Elapsed execution time in milliseconds, or -1 when the attempt failed before a duration was available. */
	duration: number;
}

/** Data passed with the message command error event. */
export interface MessageCommandErrorPayload extends MessageCommandRunPayload {
	/** Elapsed execution time in milliseconds, or -1 when the attempt failed before a duration was available. */
	duration: number;
}

/** Data passed with the message command success event. */
export interface MessageCommandSuccessPayload extends MessageCommandRunPayload {
	/** Value returned by the handler. */
	result: unknown;
	/** Elapsed execution time in milliseconds, or -1 when the attempt failed before a duration was available. */
	duration: number;
}

/** Data passed with the message command typing error event. */
export type MessageCommandTypingErrorPayload = MessageCommandRunPayload;

/** Data passed with the unknown chat input command event. */
export interface UnknownChatInputCommandPayload {
	/** Discord interaction that triggered this event. */
	interaction: ChatInputCommandInteraction;
	/** Invocation metadata passed to the command. */
	context: ChatInputCommandContext;
}

/** Data passed with the command does not have chat input command handler event. */
export interface CommandDoesNotHaveChatInputCommandHandlerPayload {
	/** Discord interaction that triggered this event. */
	interaction: ChatInputCommandInteraction;
	/** Command associated with this invocation. */
	command: Command;
	/** Invocation metadata passed to the command. */
	context: ChatInputCommandContext;
}

/** Interaction and command shared by slash-command events. */
export interface IChatInputCommandPayload extends PreconditionContext {
	/** Discord interaction that triggered this event. */
	interaction: ChatInputCommandInteraction;
	/** Command associated with this invocation. */
	command: ChatInputCommand;
}

/** Data passed with the pre chat input command run event. */
export interface PreChatInputCommandRunPayload extends IChatInputCommandPayload {
	/** Invocation metadata passed to the command. */
	context: ChatInputCommandContext;
}

/** Data passed with the chat input command denied event. */
export interface ChatInputCommandDeniedPayload extends IChatInputCommandPayload {
	/** Invocation metadata passed to the command. */
	context: ChatInputCommandContext;
}

/** Data passed with the chat input command accepted event. */
export type ChatInputCommandAcceptedPayload = PreChatInputCommandRunPayload;

/** Data passed with the chat input command run event. */
export type ChatInputCommandRunPayload = ChatInputCommandAcceptedPayload;

/** Data passed with the chat input command finish event. */
export interface ChatInputCommandFinishPayload extends ChatInputCommandAcceptedPayload {
	/** Whether the command attempt completed successfully. */
	success: boolean;
	/** Elapsed execution time in milliseconds, or -1 when the attempt failed before a duration was available. */
	duration: number;
}

/** Data passed with the chat input command success event. */
export interface ChatInputCommandSuccessPayload extends ChatInputCommandRunPayload {
	/** Value returned by the handler. */
	result: unknown;
	/** Elapsed execution time in milliseconds, or -1 when the attempt failed before a duration was available. */
	duration: number;
}

/** Data passed with the chat input command error event. */
export interface ChatInputCommandErrorPayload extends IChatInputCommandPayload {
	/** Elapsed execution time in milliseconds, or -1 when the attempt failed before a duration was available. */
	duration: number;
}

/** Data passed with the unknown context menu command event. */
export interface UnknownContextMenuCommandPayload {
	/** Discord interaction that triggered this event. */
	interaction: ContextMenuCommandInteraction;
	/** Invocation metadata passed to the command. */
	context: ContextMenuCommandContext;
}

/** Data passed with the command does not have context menu command handler event. */
export interface CommandDoesNotHaveContextMenuCommandHandlerPayload {
	/** Discord interaction that triggered this event. */
	interaction: ContextMenuCommandInteraction;
	/** Invocation metadata passed to the command. */
	context: ContextMenuCommandContext;
	/** Command associated with this invocation. */
	command: Command;
}

/** Interaction and command shared by context-menu events. */
export interface IContextMenuCommandPayload extends PreconditionContext {
	/** Discord interaction that triggered this event. */
	interaction: ContextMenuCommandInteraction;
	/** Command associated with this invocation. */
	command: ContextMenuCommand;
}

/** Data passed with the pre context menu command run event. */
export interface PreContextMenuCommandRunPayload extends IContextMenuCommandPayload {
	/** Invocation metadata passed to the command. */
	context: ContextMenuCommandContext;
}

/** Data passed with the context menu command denied event. */
export interface ContextMenuCommandDeniedPayload extends IContextMenuCommandPayload {
	/** Invocation metadata passed to the command. */
	context: ContextMenuCommandContext;
}

/** Data passed with the context menu command accepted event. */
export type ContextMenuCommandAcceptedPayload = PreContextMenuCommandRunPayload;

/** Data passed with the context menu command run event. */
export type ContextMenuCommandRunPayload = ContextMenuCommandAcceptedPayload;

/** Data passed with the context menu command finish event. */
export interface ContextMenuCommandFinishPayload extends ContextMenuCommandAcceptedPayload {
	/** Whether the command attempt completed successfully. */
	success: boolean;
	/** Elapsed execution time in milliseconds, or -1 when the attempt failed before a duration was available. */
	duration: number;
}

/** Data passed with the context menu command success event. */
export interface ContextMenuCommandSuccessPayload extends ContextMenuCommandRunPayload {
	/** Value returned by the handler. */
	result: unknown;
	/** Elapsed execution time in milliseconds, or -1 when the attempt failed before a duration was available. */
	duration: number;
}

/** Data passed with the context menu command error event. */
export interface ContextMenuCommandErrorPayload extends IContextMenuCommandPayload {
	/** Elapsed execution time in milliseconds, or -1 when the attempt failed before a duration was available. */
	duration: number;
}

/** Interaction and handler shared by interaction-handler events. */
export interface IInteractionHandlerPayload {
	/** Discord interaction that triggered this event. */
	interaction: Interaction;
	/** Interaction handler associated with the event. */
	handler: InteractionHandler;
}

/** Data passed with the interaction handler parse success event family. */
export type InteractionHandlerParseSuccess = IInteractionHandlerPayload;

/** Data passed with the interaction handler parse some event family. */
export interface InteractionHandlerParseSome<
	T = unknown,
> extends IInteractionHandlerPayload {
	/** Parsed value returned inside Some. */
	value: T;
}

/** Data passed with the interaction handler parse none event family. */
export type InteractionHandlerParseNone = IInteractionHandlerPayload;

/** Data passed with the interaction handler parse error event family. */
export type InteractionHandlerParseError = IInteractionHandlerPayload;

/** Data passed with the interaction handler error event family. */
export type InteractionHandlerError = IInteractionHandlerPayload;

/** Data passed with the autocomplete interaction event. */
export interface AutocompleteInteractionPayload {
	/** Discord interaction that triggered this event. */
	interaction: AutocompleteInteraction;
	/** Command associated with this invocation. */
	command: AutocompleteCommand;
	/** Invocation metadata passed to the command. */
	context: AutocompleteCommandContext;
}

/**
 * Local key alias for the typed event augmentation.
 * @internal
 */
declare const KairoEvents: typeof Events;

/** Add KairoJS events to the discord.js event map. */
declare module "discord.js" {
	/** Framework event argument tuples. Listen using Events constants. */
	interface ClientEvents {
		// #region KairoJS load cycle events
		/** A module was removed after successful cleanup. */
		[KairoEvents.ModuleUnloaded]: [store: ModuleStore<Module>, module: Module];
		/** A module finished activation and entered its store. */
		[KairoEvents.ModuleLoaded]: [store: ModuleStore<Module>, module: Module];

		/** A listener’s run method threw or rejected. */
		[KairoEvents.ListenerError]: [
			error: unknown,
			payload: ListenerErrorPayload,
		];
		/** A command’s application-registration hook failed. */
		[KairoEvents.CommandApplicationCommandRegistryError]: [
			error: unknown,
			command: Command,
		];
		/** Application command registration is starting. */
		[KairoEvents.ApplicationCommandRegistriesInitialising]: [];
		/** The registration pass completed, with the registry map and elapsed milliseconds. */
		[KairoEvents.ApplicationCommandRegistriesRegistered]: [
			registries: Map<string, ApplicationCommandRegistry>,
			timeTaken: number,
		];
		/** One global or guild command list was replaced; a null guild ID means global. */
		[KairoEvents.ApplicationCommandRegistriesBulkOverwrite]: [
			result: Collection<Snowflake, ApplicationCommand>,
			guildId: string | null,
		];
		/** A global or guild bulk overwrite failed; a null guild ID means global. */
		[KairoEvents.ApplicationCommandRegistriesBulkOverwriteError]: [
			error: unknown,
			guildId: string | null,
		];

		/** A non-bot message enters prefix parsing. */
		[KairoEvents.PreMessageParsed]: [message: Message];
		/** A message contains only the bot mention prefix. */
		[KairoEvents.MentionPrefixOnly]: [message: Message];
		/** No configured or mention prefix matched the message. */
		[KairoEvents.NonPrefixedMessage]: [message: Message];
		/** A message prefix matched, before command-name parsing. */
		[KairoEvents.PrefixedMessage]: [message: Message, prefix: string | RegExp];

		/** No command name followed the matched prefix. */
		[KairoEvents.UnknownMessageCommandName]: [
			payload: UnknownMessageCommandNamePayload,
		];
		/** The parsed message command name was not found. */
		[KairoEvents.UnknownMessageCommand]: [
			payload: UnknownMessageCommandPayload,
		];
		/** A matched command has no messageRun handler. */
		[KairoEvents.CommandDoesNotHaveMessageCommandHandler]: [
			payload: CommandDoesNotHaveMessageCommandHandler,
		];
		/** A message command is ready for precondition checks. */
		[KairoEvents.PreMessageCommandRun]: [payload: PreMessageCommandRunPayload];

		/** Message command preconditions returned a denial. */
		[KairoEvents.MessageCommandDenied]: [
			error: UserError,
			payload: MessageCommandDeniedPayload,
		];
		/** Message command preconditions passed; argument preparation and execution follow. */
		[KairoEvents.MessageCommandAccepted]: [
			payload: MessageCommandAcceptedPayload,
		];

		/** A prepared message command is about to run. */
		[KairoEvents.MessageCommandRun]: [
			message: Message,
			command: Command,
			payload: MessageCommandRunPayload,
		];
		/** A message command resolved successfully; the payload includes its result and duration. */
		[KairoEvents.MessageCommandSuccess]: [
			payload: MessageCommandSuccessPayload,
		];
		/** The message-command run phase threw or rejected. Argument preparation failures are reported through ListenerError. */
		[KairoEvents.MessageCommandError]: [
			error: unknown,
			payload: MessageCommandErrorPayload,
		];
		/** A message command attempt finished, with success state and duration. */
		[KairoEvents.MessageCommandFinish]: [
			message: Message,
			command: Command,
			payload: MessageCommandFinishPayload,
		];

		/** Sending the message command’s typing indicator failed. */
		[KairoEvents.MessageCommandTypingError]: [
			error: Error,
			payload: MessageCommandTypingErrorPayload,
		];

		/** One extension lifecycle hook completed successfully. */
		[KairoEvents.ExtensionLoaded]: [
			hook: "setup" | "beforeLogin" | "afterLogin",
			name: string | undefined,
		];

		/** An interaction handler’s parse method returned an Option without throwing. */
		[KairoEvents.InteractionHandlerParseSuccess]: [
			option: Option<unknown>,
			payload: InteractionHandlerParseSuccess,
		];
		/** A handler accepted an interaction with Some; its parsed value is included. */
		[KairoEvents.InteractionHandlerParseSome]: [
			option: Option.Some<unknown>,
			payload: InteractionHandlerParseSome,
		];
		/** A handler skipped an interaction with None. */
		[KairoEvents.InteractionHandlerParseNone]: [
			option: Option.None,
			payload: InteractionHandlerParseNone,
		];
		/** A handler’s parse method threw or rejected. */
		[KairoEvents.InteractionHandlerParseError]: [
			error: unknown,
			payload: InteractionHandlerParseError,
		];
		/** An accepted interaction handler’s run method threw or rejected. */
		[KairoEvents.InteractionHandlerError]: [
			error: unknown,
			payload: InteractionHandlerError,
		];

		/** An autocomplete interaction enters command lookup. */
		[KairoEvents.PossibleAutocompleteInteraction]: [
			interaction: AutocompleteInteraction,
		];
		/** A command’s autocomplete handler threw or rejected. */
		[KairoEvents.CommandAutocompleteInteractionError]: [
			error: unknown,
			payload: AutocompleteInteractionPayload,
		];
		/** A command’s autocomplete handler completed successfully. */
		[KairoEvents.CommandAutocompleteInteractionSuccess]: [
			payload: AutocompleteInteractionPayload,
		];

		// Chat input command chain
		/** A slash interaction enters command lookup. */
		[KairoEvents.PossibleChatInputCommand]: [
			interaction: ChatInputCommandInteraction,
		];
		/** No local command matched the slash interaction. */
		[KairoEvents.UnknownChatInputCommand]: [
			payload: UnknownChatInputCommandPayload,
		];
		/** The matched command has no slash handler. */
		[KairoEvents.CommandDoesNotHaveChatInputCommandHandler]: [
			payload: CommandDoesNotHaveChatInputCommandHandlerPayload,
		];
		/** A slash command is ready for precondition checks. */
		[KairoEvents.PreChatInputCommandRun]: [
			payload: PreChatInputCommandRunPayload,
		];

		/** The slash command’s preconditions denied the invocation. */
		[KairoEvents.ChatInputCommandDenied]: [
			error: UserError,
			payload: ChatInputCommandDeniedPayload,
		];
		/** The slash command’s preconditions passed. */
		[KairoEvents.ChatInputCommandAccepted]: [
			payload: ChatInputCommandAcceptedPayload,
		];

		/** An accepted slash handler is about to run. */
		[KairoEvents.ChatInputCommandRun]: [
			interaction: ChatInputCommandInteraction,
			command: ChatInputCommand,
			payload: ChatInputCommandRunPayload,
		];
		/** A slash handler completed, with its return value and duration. */
		[KairoEvents.ChatInputCommandSuccess]: [
			payload: ChatInputCommandSuccessPayload,
		];
		/** A slash command attempt threw or rejected. */
		[KairoEvents.ChatInputCommandError]: [
			error: unknown,
			payload: ChatInputCommandErrorPayload,
		];
		/** A slash command attempt finished, with success state and duration. */
		[KairoEvents.ChatInputCommandFinish]: [
			interaction: ChatInputCommandInteraction,
			command: ChatInputCommand,
			payload: ChatInputCommandFinishPayload,
		];

		// Context menu command chain
		/** A context-menu interaction enters command lookup. */
		[KairoEvents.PossibleContextMenuCommand]: [
			interaction: ContextMenuCommandInteraction,
		];
		/** No local command matched the context-menu interaction. */
		[KairoEvents.UnknownContextMenuCommand]: [
			payload: UnknownContextMenuCommandPayload,
		];
		/** The matched command has no context-menu handler. */
		[KairoEvents.CommandDoesNotHaveContextMenuCommandHandler]: [
			payload: CommandDoesNotHaveContextMenuCommandHandlerPayload,
		];
		/** A context-menu command is ready for precondition checks. */
		[KairoEvents.PreContextMenuCommandRun]: [
			payload: PreContextMenuCommandRunPayload,
		];

		/** The context-menu command’s preconditions denied the invocation. */
		[KairoEvents.ContextMenuCommandDenied]: [
			error: UserError,
			payload: ContextMenuCommandDeniedPayload,
		];
		/** The context-menu command’s preconditions passed. */
		[KairoEvents.ContextMenuCommandAccepted]: [
			payload: ContextMenuCommandAcceptedPayload,
		];

		/** An accepted context-menu handler is about to run. */
		[KairoEvents.ContextMenuCommandRun]: [
			interaction: ContextMenuCommandInteraction,
			command: ContextMenuCommand,
			payload: ContextMenuCommandRunPayload,
		];
		/** A context-menu handler completed, with its return value and duration. */
		[KairoEvents.ContextMenuCommandSuccess]: [
			payload: ContextMenuCommandSuccessPayload,
		];
		/** A context-menu command attempt threw or rejected. */
		[KairoEvents.ContextMenuCommandError]: [
			error: unknown,
			payload: ContextMenuCommandErrorPayload,
		];
		/** A context-menu command attempt finished, with success state and duration. */
		[KairoEvents.ContextMenuCommandFinish]: [
			interaction: ContextMenuCommandInteraction,
			command: ContextMenuCommand,
			payload: ContextMenuCommandFinishPayload,
		];

		// #endregion KairoJS load cycle events

		// #region Termination
		/** Additional event names may supply arbitrary arguments. */
		[K: string]: unknown[];
		// #endregion Termination
	}
}
