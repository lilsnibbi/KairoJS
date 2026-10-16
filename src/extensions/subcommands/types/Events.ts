import type { Message } from "discord.js";
import { type Args } from "../../../commands/arguments/Args";
import { type UserError } from "../../../commands/errors/UserError";
import {
	type ChatInputCommand,
	type ChatInputCommandContext,
	type MessageCommand,
} from "../../../commands/types";
import { type MessageCommandDeniedPayload } from "../../../events/events";
import type { Subcommand } from "../Subcommand";
import type {
	ChatInputCommandSubcommandMappingMethod,
	MessageSubcommandMappingMethod,
	SubcommandMappingMethod,
} from "./mappings";

export const SubcommandEvents = {
	ChatInputSubcommandDenied: "chatInputSubcommandDenied" as const,
	ChatInputSubcommandRun: "chatInputSubcommandRun" as const,
	ChatInputSubcommandSuccess: "chatInputSubcommandSuccess" as const,
	ChatInputSubcommandError: "chatInputSubcommandError" as const,
	ChatInputSubcommandNoMatch: "chatInputSubcommandNoMatch" as const,

	MessageSubcommandDenied: "messageSubcommandDenied" as const,
	MessageSubcommandRun: "messageSubcommandRun" as const,
	MessageSubcommandSuccess: "messageSubcommandSuccess" as const,
	MessageSubcommandError: "messageSubcommandError" as const,
	MessageSubcommandNoMatch: "messageSubcommandNoMatch" as const,

	SubcommandMappingIsMissingMessageCommandHandler:
		"subcommandMappingIsMissingMessageCommandHandler" as const,
	SubcommandMappingIsMissingChatInputCommandHandler:
		"subcommandMappingIsMissingChatInputCommandHandler" as const,
};

export enum SubcommandErrors {
	MessageSubcommandNoMatch = "messageSubcommandNoMatch",
	ChatInputSubcommandNoMatch = "chatInputSubcommandNoMatch",
	SubcommandNotFound = "subcommandNotFound",
}

export interface MessageSubcommandNoMatchContext
	extends MessageCommand.RunContext {
	command: Subcommand;
	identifier: SubcommandErrors.MessageSubcommandNoMatch;
	message: string;
	possibleSubcommandName: string | null;
	possibleSubcommandGroupOrName: string | null;
}

export interface ChatInputSubcommandNoMatchContext extends ChatInputCommandContext {
	command: Subcommand;
	identifier: SubcommandErrors.ChatInputSubcommandNoMatch;
	message: string;
}

export interface IMessageSubcommandPayload {
	message: Message;
	command: Subcommand;
}

export interface MessageSubcommandDeniedPayload
	extends
		Omit<MessageCommandDeniedPayload, "parameters" | "command">,
		MessageSubcommandAcceptedPayload {
	parameters?: string;
}

export interface MessageSubcommandAcceptedPayload extends IMessageSubcommandPayload {
	context: MessageCommand.RunContext;
	matchedSubcommandMapping: SubcommandMappingMethod;
}

export interface MessageSubcommandRunPayload extends MessageSubcommandAcceptedPayload {}

export interface MessageSubcommandErrorPayload extends MessageSubcommandRunPayload {}

export interface MessageSubcommandSuccessPayload extends MessageSubcommandRunPayload {
	result: unknown;
}

export interface IChatInputSubcommandPayload {
	interaction: ChatInputCommand.Interaction;
	command: Subcommand;
}

export interface ChatInputSubcommandAcceptedPayload extends IChatInputSubcommandPayload {
	context: ChatInputCommand.RunContext;
	matchedSubcommandMapping: SubcommandMappingMethod;
}

export interface ChatInputSubcommandDeniedPayload extends ChatInputSubcommandAcceptedPayload {}

export interface ChatInputSubcommandRunPayload extends ChatInputSubcommandAcceptedPayload {}

export interface ChatInputSubcommandErrorPayload extends ChatInputSubcommandRunPayload {}

export interface ChatInputSubcommandSuccessPayload extends ChatInputSubcommandRunPayload {
	result: unknown;
}

declare module "discord.js" {
	interface ClientEvents {
		[SubcommandEvents.ChatInputSubcommandDenied]: [
			error: UserError,
			payload: ChatInputSubcommandDeniedPayload,
		];
		[SubcommandEvents.ChatInputSubcommandRun]: [
			interaction: ChatInputCommand.Interaction,
			subcommand: ChatInputCommandSubcommandMappingMethod,
			payload: ChatInputSubcommandRunPayload,
		];
		[SubcommandEvents.ChatInputSubcommandSuccess]: [
			interaction: ChatInputCommand.Interaction,
			subcommand: ChatInputCommandSubcommandMappingMethod,
			payload: ChatInputSubcommandSuccessPayload,
		];
		[SubcommandEvents.ChatInputSubcommandError]: [
			error: unknown,
			payload: ChatInputSubcommandErrorPayload,
		];
		[SubcommandEvents.ChatInputSubcommandNoMatch]: [
			interaction: ChatInputCommand.Interaction,
			context: ChatInputSubcommandNoMatchContext,
		];

		[SubcommandEvents.MessageSubcommandDenied]: [
			error: UserError,
			payload: MessageSubcommandDeniedPayload,
		];
		[SubcommandEvents.MessageSubcommandRun]: [
			message: Message,
			subcommand: MessageSubcommandMappingMethod,
			payload: MessageSubcommandRunPayload,
		];
		[SubcommandEvents.MessageSubcommandSuccess]: [
			message: Message,
			subcommand: MessageSubcommandMappingMethod,
			payload: MessageSubcommandSuccessPayload,
		];
		[SubcommandEvents.MessageSubcommandError]: [
			error: unknown,
			payload: MessageSubcommandErrorPayload,
		];
		[SubcommandEvents.MessageSubcommandNoMatch]: [
			message: Message,
			args: Args,
			context: MessageSubcommandNoMatchContext,
		];

		[SubcommandEvents.SubcommandMappingIsMissingMessageCommandHandler]: [
			message: Message,
			subcommand: SubcommandMappingMethod,
			payload: MessageSubcommandAcceptedPayload,
		];
		[SubcommandEvents.SubcommandMappingIsMissingChatInputCommandHandler]: [
			message: ChatInputCommand.Interaction,
			subcommand: SubcommandMappingMethod,
			payload: ChatInputSubcommandAcceptedPayload,
		];
	}
}
