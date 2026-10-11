import type { URL } from 'node:url';
import type {
	CategoryChannel,
	ChannelType,
	DMChannel,
	GuildMember,
	Message,
	NewsChannel,
	Role,
	StageChannel,
	TextChannel,
	ThreadChannel,
	User,
	VoiceChannel
} from 'discord.js';
import { container } from '../../core/modules/index';
import type { ChannelTypes, GuildBasedChannelTypes } from '../../utilities/discord/index';
import type { Awaitable } from '../../utilities/index';
import { type ArgumentStream, join, type Parameter } from '../../utilities/parsing/index';
import { Option, Result } from '../../utilities/result/index';
import { ArgumentError } from '../errors/ArgumentError';
import { Identifiers } from '../errors/Identifiers';
import { UserError } from '../errors/UserError';
import type { MessageCommand } from '../types';
import type { Argument, IArgument } from './Argument';
import type { EmojiObject } from './resolvers/emoji';

/** The argument parser to be used in {@link Command}. */
export class Args {
	/** The original message that triggered the command. */
	public readonly message: Message;

	/** The command that is being run. */
	public readonly command: MessageCommand;

	/** The context of the command being run. */
	public readonly commandContext: MessageCommand.RunContext;

	/** The internal Lexure parser. */
	protected readonly parser: ArgumentStream;

	/** The states stored in the args. */
	private readonly states: ArgumentStream.State[] = [];

	public constructor(message: Message, command: MessageCommand, parser: ArgumentStream, context: MessageCommand.RunContext) {
		this.message = message;
		this.command = command;
		this.parser = parser;
		this.commandContext = context;
	}

	/** Set the parser to the first token. */
	public start(): Args {
		this.parser.reset();
		return this;
	}

	/** Get the next parameter and parses it. Advances index on success. */
	public async pickResult<T>(type: IArgument<T>, options?: ArgOptions): Promise<ResultType<T>>;
	/** Get the next parameter and parses it. Advances index on success. */
	public async pickResult<K extends keyof ArgType>(type: K, options?: ArgOptions): Promise<ResultType<ArgType[K]>>;
	public async pickResult<K extends keyof ArgType>(type: K, options: ArgOptions = {}): Promise<ResultType<ArgType[K]>> {
		const argument = this.resolveArgument<ArgType[K]>(type);
		if (!argument) return this.unavailableArgument(type);

		const result = await this.parser.singleParseAsync(async (arg) =>
			argument.run(arg, {
				args: this,
				argument,
				message: this.message,
				command: this.command,
				commandContext: this.commandContext,
				...options
			})
		);
		if (result.isErrAnd((value) => value === null)) {
			return this.missingArguments();
		}

		return result as ResultType<ArgType[K]>;
	}

	/** Similar to {@link Args.pickResult} but returns the value on success, throwing otherwise. */
	public async pick<T>(type: IArgument<T>, options?: ArgOptions): Promise<T>;
	/** Similar to {@link Args.pickResult} but returns the value on success, throwing otherwise. */
	public async pick<K extends keyof ArgType>(type: K, options?: ArgOptions): Promise<ArgType[K]>;
	public async pick<K extends keyof ArgType>(type: K, options?: ArgOptions): Promise<ArgType[K]> {
		const result = await this.pickResult(type, options);
		return result.unwrapRaw();
	}

	/** Get all the following arguments. */
	public async restResult<T>(type: IArgument<T>, options?: ArgOptions): Promise<ResultType<T>>;
	/** Get all the following arguments. */
	public async restResult<K extends keyof ArgType>(type: K, options?: ArgOptions): Promise<ResultType<ArgType[K]>>;
	public async restResult<T>(type: keyof ArgType | IArgument<T>, options: ArgOptions = {}): Promise<ResultType<T>> {
		const argument = this.resolveArgument(type);
		if (!argument) return this.unavailableArgument(type);
		if (this.parser.finished) return this.missingArguments();

		const state = this.parser.save();
		const data = join(this.parser.many().unwrapOr<Parameter[]>([]));
		const result = await argument.run(data, {
			args: this,
			argument,
			message: this.message,
			command: this.command,
			commandContext: this.commandContext,
			...options
		});

		return result.inspectErr(() => this.parser.restore(state));
	}

	/** Similar to {@link Args.restResult} but returns the value on success, throwing otherwise. */
	public async rest<T>(type: IArgument<T>, options?: ArgOptions): Promise<T>;
	/** Similar to {@link Args.restResult} but returns the value on success, throwing otherwise. */
	public async rest<K extends keyof ArgType>(type: K, options?: ArgOptions): Promise<ArgType[K]>;
	public async rest<K extends keyof ArgType>(type: K, options?: ArgOptions): Promise<ArgType[K]> {
		const result = await this.restResult(type, options);
		return result.unwrapRaw();
	}

	/** Get all the following arguments. */
	public async repeatResult<T>(type: IArgument<T>, options?: RepeatArgOptions): Promise<ArrayResultType<T>>;
	/** Get all the following arguments. */
	public async repeatResult<K extends keyof ArgType>(type: K, options?: RepeatArgOptions): Promise<ArrayResultType<ArgType[K]>>;
	public async repeatResult<K extends keyof ArgType>(type: K, options: RepeatArgOptions = {}): Promise<ArrayResultType<ArgType[K]>> {
		const argument = this.resolveArgument(type);
		if (!argument) return this.unavailableArgument(type);
		if (this.parser.finished) return this.missingArguments();

		const output: ArgType[K][] = [];

		for (let i = 0, times = options.times ?? Infinity; i < times; i++) {
			const result = await this.parser.singleParseAsync(async (arg) =>
				argument.run(arg, {
					args: this,
					argument,
					message: this.message,
					command: this.command,
					commandContext: this.commandContext,
					...options
				})
			);

			if (result.isErr()) {
				const error = result.unwrapErr();
				if (error === null) break;

				if (output.length === 0) {
					return result as Result.Err<UserError | ArgumentError<ArgType[K]>>;
				}

				break;
			}

			output.push(result.unwrap() as ArgType[K]);
		}

		return Result.ok(output);
	}

	/** Similar to {@link Args.repeatResult} but returns the value on success, throwing otherwise. */
	public async repeat<T>(type: IArgument<T>, options?: RepeatArgOptions): Promise<T[]>;
	/** Similar to {@link Args.repeatResult} but returns the value on success, throwing otherwise. */
	public async repeat<K extends keyof ArgType>(type: K, options?: RepeatArgOptions): Promise<ArgType[K][]>;
	public async repeat<K extends keyof ArgType>(type: K, options?: RepeatArgOptions): Promise<ArgType[K][]> {
		const result = await this.repeatResult(type, options);
		return result.unwrapRaw();
	}

	/** Peeks the following parameter(s) without advancing the parser's state. */
	public async peekResult<T>(type: () => Argument.Result<T>): Promise<ResultType<T>>;
	/** Peeks the following parameter(s) without advancing the parser's state. */
	public async peekResult<T>(type: IArgument<T>, options?: ArgOptions): Promise<ResultType<T>>;
	/** Peeks the following parameter(s) without advancing the parser's state. */
	public async peekResult<K extends keyof ArgType>(
		type: (() => Awaitable<Argument.Result<ArgType[K]>>) | K,
		options?: ArgOptions
	): Promise<ResultType<ArgType[K]>>;

	public async peekResult<K extends keyof ArgType>(
		type: (() => Awaitable<Argument.Result<ArgType[K]>>) | K,
		options: ArgOptions = {}
	): Promise<ResultType<ArgType[K]>> {
		this.save();
		const result = typeof type === 'function' ? await type() : await this.pickResult(type, options);
		this.restore();
		return result;
	}

	/** Similar to {@link Args.peekResult} but returns the value on success, throwing otherwise. */
	public async peek<T>(type: () => Argument.Result<T>): Promise<T>;
	/** Similar to {@link Args.peekResult} but returns the value on success, throwing otherwise. */
	public async peek<T>(type: IArgument<T>, options?: ArgOptions): Promise<T>;
	/** Similar to {@link Args.peekResult} but returns the value on success, throwing otherwise. */
	public async peek<K extends keyof ArgType>(type: (() => Argument.Result<ArgType[K]>) | K, options?: ArgOptions): Promise<ArgType[K]>;
	public async peek<K extends keyof ArgType>(type: (() => Argument.Result<ArgType[K]>) | K, options?: ArgOptions): Promise<ArgType[K]> {
		const result = await this.peekResult(type, options);
		return result.unwrapRaw();
	}

	/** Get the next raw argument from the parser. */
	public nextMaybe(): Option<string>;
	/** Get the value of the next unused ordered token, but only if it could be transformed. That token will now be used if the transformation succeeds. @typeparam T Output type of the {@link ArgsNextCallback callback}. */
	public nextMaybe<T>(cb: ArgsNextCallback<T>): Option<T>;
	public nextMaybe<T>(cb?: ArgsNextCallback<T>): Option<T | string> {
		return Option.from<T | string>(typeof cb === 'function' ? this.parser.singleMap(cb) : this.parser.single());
	}

	/** Similar to {@link Args.nextMaybe} but returns the value on success, null otherwise. */
	public next(): string;
	/** Similar to {@link Args.nextMaybe} but returns the value on success, null otherwise. @typeparam T Output type of the {@link ArgsNextCallback callback}. */
	public next<T>(cb: ArgsNextCallback<T>): T;
	public next<T>(cb?: ArgsNextCallback<T>): T | string | null {
		const value = cb ? this.nextMaybe<T | string | null>(cb) : this.nextMaybe();
		return value.unwrapOr(null);
	}

	/** Check if one or more flag were given. */
	public getFlags(...keys: readonly string[]): boolean {
		return this.parser.flag(...keys);
	}

	/** Get the last value of one or more options as an {@link Option}. If you do not care about safely handling non-existing values you can use {@link Args.getOption} to get `string | null` as return type */
	public getOptionResult(...keys: readonly string[]): Option<string> {
		return this.parser.option(...keys);
	}

	/** Get the last value of one or more options. Similar to {@link Args.getOptionResult} but returns the value on success, or `null` if not. */
	public getOption(...keys: readonly string[]): string | null {
		return this.parser.option(...keys).unwrapOr(null);
	}

	/** Get all the values of one or more option. */
	public getOptionsResult(...keys: readonly string[]): Option<readonly string[]> {
		return this.parser.options(...keys);
	}

	/** Get all the values of one or more option. Similar to {@link Args.getOptionsResult} but returns the value on success, or `null` if not. */
	public getOptions(...keys: readonly string[]): readonly string[] | null {
		return this.parser.options(...keys).unwrapOr(null);
	}

	/** Saves the current state into the stack following a FILO strategy (first-in, last-out). */
	public save(): void {
		this.states.push(this.parser.save());
	}

	/** Restores the previously saved state from the stack. */
	public restore(): void {
		if (this.states.length !== 0) this.parser.restore(this.states.pop()!);
	}

	/** Whether all arguments have been consumed. */
	public get finished(): boolean {
		return this.parser.finished;
	}

	/** Defines the `JSON.stringify` override. */
	public toJSON(): ArgsJson {
		return { message: this.message, command: this.command, commandContext: this.commandContext };
	}

	protected unavailableArgument<T>(type: string | IArgument<T>): Result.Err<UserError> {
		const name = typeof type === 'string' ? type : type.name;
		return Result.err(
			new UserError({
				identifier: Identifiers.ArgsUnavailable,
				message: `The argument "${name}" was not found.`,
				context: { name, ...this.toJSON() }
			})
		);
	}

	protected missingArguments(): Result.Err<UserError> {
		return Result.err(
			new UserError({ identifier: Identifiers.ArgsMissing, message: 'There are no more arguments.', context: this.toJSON() })
		);
	}

	/** Resolve an argument. */
	private resolveArgument<T>(arg: keyof ArgType | IArgument<T>): IArgument<T> | undefined {
		if (typeof arg === 'object') return arg;
		return container.modules.require('arguments').get(arg as string) as IArgument<T> | undefined;
	}

	/** Convert a callback into a usable argument. */
	public static make<T>(cb: IArgument<T>['run'], name = ''): IArgument<T> {
		return { run: cb, name };
	}

	/** Create an {@link Ok} result. */
	public static ok<T>(value: T): Result.Ok<T> {
		return Result.ok(value);
	}

	/** Create an {@link Err} result containing an {@link ArgumentError}. */
	public static error<T>(options: ArgumentError.Options<T>): Result.Err<ArgumentError<T>> {
		return Result.err(new ArgumentError<T>(options));
	}
}

export interface ArgsJson {
	message: Message<boolean>;
	command: MessageCommand;
	commandContext: MessageCommand.RunContext;
}

export interface ArgType {
	boolean: boolean;
	channel: ChannelTypes;
	date: Date;
	dmChannel: DMChannel;
	emoji: EmojiObject;
	float: number;
	guildCategoryChannel: CategoryChannel;
	guildChannel: GuildBasedChannelTypes;
	guildNewsChannel: NewsChannel;
	guildNewsThreadChannel: ThreadChannel & { type: ChannelType.AnnouncementThread; parent: NewsChannel | null };
	guildPrivateThreadChannel: ThreadChannel & { type: ChannelType.PrivateThread; parent: TextChannel | null };
	guildPublicThreadChannel: ThreadChannel & { type: ChannelType.PublicThread; parent: TextChannel | null };
	guildStageVoiceChannel: StageChannel;
	guildTextChannel: TextChannel;
	guildThreadChannel: ThreadChannel;
	guildVoiceChannel: VoiceChannel;
	hyperlink: URL;
	integer: number;
	member: GuildMember;
	message: Message;
	number: number;
	role: Role;
	string: string;
	url: URL;
	user: User;
	enum: string;
}

export interface ArgOptions extends Omit<Argument.RunContext, 'message' | 'command'> {}

export interface RepeatArgOptions extends ArgOptions {
	/** The maximum number of times the argument can be repeated.
	 * @default Infinity */
	times?: number;
}

/** The callback used for {@link Args.nextMaybe} and {@link Args.next}. */
export type ArgsNextCallback<T> = (value: string) => Option<T>;

export type ResultType<T> = Result<T, UserError | ArgumentError<T>>;
export type ArrayResultType<T> = Result<T[], UserError | ArgumentError<T>>;
