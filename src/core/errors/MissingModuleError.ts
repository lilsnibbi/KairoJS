import { ModuleLoadError, ModuleLoadErrorType } from "./ModuleLoadError";

/** Describes a {@link ModuleLoadErrorType.EmptyModule} loader error and adds a path for easy identification. */
export class MissingModuleError extends ModuleLoadError {
	/** The path of the module that did not have exports. */
	public readonly path: string;

	public constructor(path: string) {
		super(
			ModuleLoadErrorType.EmptyModule,
			`A compatible class export was not found. [${path}]`,
		);
		this.path = path;
	}
}
