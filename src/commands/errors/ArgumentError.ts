import type { IArgument } from '../arguments/Argument';
import { UserError } from './UserError';

/** Errors thrown by the argument parser */
export class ArgumentError<T = unknown> extends UserError {
	public readonly argument: IArgument<T>;
	public readonly parameter: string;

	public constructor(options: ArgumentError.Options<T>) {
		super({ ...options, identifier: options.identifier ?? options.argument.name });
		this.argument = options.argument;
		this.parameter = options.parameter;
	}

	public override get name(): string {
		return 'ArgumentError';
	}
}

export namespace ArgumentError {
	/** The options for {@link ArgumentError}. */
	export interface Options<T> extends Omit<UserError.Options, 'identifier'> {
		/** The argument that caused the error. */
		argument: IArgument<T>;

		/** The parameter that failed to be parsed. */
		parameter: string;

		/** The identifier.
		 * @default argument.name */
		identifier?: string;
	}
}
