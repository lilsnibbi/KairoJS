export enum ModuleLoadErrorType {
	EmptyModule = 'EMPTY_MODULE',
	MissingModule = 'MISSING_MODULE',
	IncorrectType = 'INCORRECT_TYPE',
	UnknownStore = 'UNKNOWN_STORE'
}

/** Describes a loader error with a type for easy identification. */
export class ModuleLoadError extends Error {
	/** The type of the error that was thrown. */
	public readonly type: ModuleLoadErrorType;

	public constructor(type: ModuleLoadErrorType, message: string) {
		super(message);
		this.type = type;
	}

	public override get name() {
		return `${super.name} [${this.type}]`;
	}
}
