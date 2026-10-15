import type { Precondition } from '../checks/Precondition';
import { UserError } from './UserError';

/** Errors thrown by preconditions @property name This will be `'PreconditionError'` and can be used to distinguish the type of error when any error gets thrown */
export class PreconditionError extends UserError {
	public readonly precondition: Precondition;

	public constructor(options: PreconditionError.Options) {
		super({ ...options, identifier: options.identifier ?? options.precondition.name });
		this.precondition = options.precondition;
	}

	public override get name(): string {
		return 'PreconditionError';
	}
}

export namespace PreconditionError {
	/** The options for {@link PreconditionError}. */
	export interface Options extends Omit<UserError.Options, 'identifier'> {
		/** The precondition that caused the error. */
		precondition: Precondition;

		/** The identifier.
		 * @default precondition.name */
		identifier?: string;
	}
}
