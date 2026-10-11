import type { Message } from 'discord.js';
import { AliasModule } from '../../core/modules/index';
import type { Awaitable } from '../../utilities/index';
import type { Result } from '../../utilities/result/index';
import type { ArgumentError } from '../errors/ArgumentError';
import type { MessageCommand } from '../types';
import { Args } from './Args';

/** Defines a synchronous result of an {@link Argument}, check {@link Argument.AsyncResult} for the asynchronous version. */
export type ArgumentResult<T> = Result<T, ArgumentError<T>>;

/** Defines a synchronous or asynchronous result of an {@link Argument}, check {@link Argument.AsyncResult} for the asynchronous version. */
export type AwaitableArgumentResult<T> = Awaitable<ArgumentResult<T>>;

/** Defines an asynchronous result of an {@link Argument}, check {@link Argument.Result} for the synchronous version. */
export type AsyncArgumentResult<T> = Promise<ArgumentResult<T>>;

export interface IArgument<T> {
	/** The name of the argument, this is used to make the identification of an argument easier. */
	readonly name: string;

	/** The method which is called when invoking the argument. */
	run(parameter: string, context: Argument.RunContext<T>): Argument.AwaitableResult<T>;
}

/** Extend this class to parse a custom argument with Args. */
export abstract class Argument<T = unknown, Options extends Argument.Options = Argument.Options>
	extends AliasModule<Options, 'arguments'>
	implements IArgument<T>
{
	public static override readonly options?: Argument.Options;
	public constructor(context: Argument.Context, options: Options = {} as Options) {
		super(context, options);
	}

	public abstract run(parameter: string, context: Argument.RunContext<T>): Argument.AwaitableResult<T>;

	/** Wraps a value into a successful value. */
	public ok(value: T): Argument.Result<T> {
		return Args.ok(value);
	}

	/** Create an {@link Err} result containing an {@link ArgumentError} with a custom type. */
	public error(options: Omit<ArgumentError.Options<T>, 'argument'>): Argument.Result<T> {
		return Args.error({ argument: this, identifier: this.name, ...options });
	}
}

export interface ArgumentOptions extends AliasModule.Options {}

export interface ArgumentContext<T = unknown> extends Record<PropertyKey, unknown> {
	argument: IArgument<T>;
	args: Args;
	message: Message;
	command: MessageCommand;
	commandContext: MessageCommand.RunContext;
	minimum?: number;
	maximum?: number;
	inclusive?: boolean;
}

export namespace Argument {
	export type Options = ArgumentOptions;
	export type RunContext<T = unknown> = ArgumentContext<T>;
	export type Context = AliasModule.Context<'arguments'>;
	export type Result<T> = ArgumentResult<T>;
	export type AwaitableResult<T> = AwaitableArgumentResult<T>;
	export type AsyncResult<T> = AsyncArgumentResult<T>;
}
