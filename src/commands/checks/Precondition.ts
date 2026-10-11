import type {
	ChannelType,
	ChatInputCommandInteraction,
	CommandInteraction,
	ContextMenuCommandInteraction,
	Message,
	PermissionsBitField,
	TextBasedChannel
} from 'discord.js';
import { Module } from '../../core/modules/index';
import type { Awaitable } from '../../utilities/index';
import { Result } from '../../utilities/result/index';
import { PreconditionError } from '../errors/PreconditionError';
import type { UserError } from '../errors/UserError';
import type { ChatInputCommand, ContextMenuCommand, MessageCommand } from '../types';
import type { CooldownPreconditionContext } from './builtins/Cooldown';

export type PreconditionResult = Awaitable<Result<unknown, UserError>>;
export type AsyncPreconditionResult = Promise<Result<unknown, UserError>>;

export class Precondition<Options extends Precondition.Options = Precondition.Options> extends Module<Options, 'preconditions'> {
	public static override readonly options?: Precondition.Options;
	public readonly position: number | null;

	public constructor(context: Precondition.Context, options: Options = {} as Options) {
		super(context, options);
		this.position = options.position ?? null;
	}

	public messageRun?(message: Message, command: MessageCommand, context: Precondition.RunContext): Precondition.Result;

	public chatInputRun?(
		interaction: ChatInputCommandInteraction,
		command: ChatInputCommand,
		context: Precondition.RunContext
	): Precondition.Result;

	public contextMenuRun?(
		interaction: ContextMenuCommandInteraction,
		command: ContextMenuCommand,
		context: Precondition.RunContext
	): Precondition.Result;

	public ok(): Precondition.Result {
		return Result.ok();
	}

	/** Create a {@link PreconditionError} with the precondition parameter set to `this`. */
	public error(options: Omit<PreconditionError.Options, 'precondition'> = {}): Precondition.Result {
		return Result.err(new PreconditionError({ precondition: this, ...options }));
	}

	protected async fetchChannelFromInteraction(interaction: CommandInteraction): Promise<TextBasedChannel> {
		const channel = (await interaction.client.channels.fetch(interaction.channelId, {
			cache: false,
			allowUnknownGuild: true
		})) as TextBasedChannel;

		return channel;
	}
}

export abstract class AllFlowsPrecondition extends Precondition {
	public abstract override messageRun(message: Message, command: MessageCommand, context: Precondition.RunContext): Precondition.Result;

	public abstract override chatInputRun(
		interaction: ChatInputCommandInteraction,
		command: ChatInputCommand,
		context: Precondition.RunContext
	): Precondition.Result;

	public abstract override contextMenuRun(
		interaction: ContextMenuCommandInteraction,
		command: ContextMenuCommand,
		context: Precondition.RunContext
	): Precondition.Result;
}

/** The registered preconditions and their contexts, if any. */
export interface Preconditions {
	SubcommandCooldown: import('../../extensions/subcommands/preconditions/SubcommandCooldown').SubcommandCooldownPreconditionContext;
	Cooldown: CooldownPreconditionContext;
	DMOnly: never;
	Enabled: never;
	GuildNewsOnly: never;
	GuildNewsThreadOnly: never;
	GuildOnly: never;
	GuildPrivateThreadOnly: never;
	GuildPublicThreadOnly: never;
	GuildTextOnly: never;
	GuildVoiceOnly: never;
	GuildThreadOnly: never;
	NSFW: never;
	RunIn: {
		types: readonly ChannelType[] | RunInPreconditionCommandSpecificData;
	};
	ClientPermissions: {
		permissions: PermissionsBitField;
	};
	UserPermissions: {
		permissions: PermissionsBitField;
	};
}

/** Allowed channels for each kind of command. */
export interface RunInPreconditionCommandSpecificData {
	messageRun: readonly ChannelType[];
	chatInputRun: readonly ChannelType[];
	contextMenuRun: readonly ChannelType[];
}

export type PreconditionKeys = keyof Preconditions;
export type SimplePreconditionKeys = {
	[K in PreconditionKeys]: Preconditions[K] extends never ? K : never;
}[PreconditionKeys];

export interface PreconditionOptions extends Module.Options {
	/** The position for the precondition to be set at in the global precondition list. If set to `null`, this precondition will not be set as a global one.
	 * @default null */
	position?: number | null;
}

export interface PreconditionContext extends Record<PropertyKey, unknown> {
	external?: boolean;
}

export namespace Precondition {
	export type Options = PreconditionOptions;
	export type Context = Module.Context<'preconditions'>;
	export type RunContext = PreconditionContext;
	export type Result = PreconditionResult;
	export type AsyncResult = AsyncPreconditionResult;
}

export namespace AllFlowsPrecondition {
	export type Options = PreconditionOptions;
	export type Context = Module.Context<'preconditions'>;
	export type RunContext = PreconditionContext;
	export type Result = PreconditionResult;
	export type AsyncResult = AsyncPreconditionResult;
}
