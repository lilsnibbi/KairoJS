import { Module } from './Module';
import type { ModuleKind } from './ModuleRegistry';

export interface AliasModuleOptions extends Module.Options {
	/** The aliases for the module.
	 * @default [] */
	readonly aliases?: readonly string[];
}

/** The module to be stored in {@link AliasModuleStore} instances. */
export class AliasModule<Options extends AliasModuleOptions = AliasModuleOptions, StoreName extends ModuleKind = ModuleKind> extends Module<
	Options,
	StoreName
> {
	public static override readonly options?: AliasModuleOptions;
	/** The aliases for the module. */
	public aliases: readonly string[];

	public constructor(context: AliasModule.Context<StoreName>, options: AliasModuleOptions = {}) {
		super(context, options);
		this.aliases = options.aliases ?? [];
	}

	/** Defines the `JSON.stringify` behavior of this alias module. */
	public override toJSON(): AliasModule.JSON {
		return {
			...super.toJSON(),
			aliases: this.aliases.slice()
		};
	}
}

/** The return type of {@link AliasModule.toJSON}. */
export interface AliasModuleJSON extends Module.JSON {
	aliases: string[];
	options: AliasModuleOptions;
}

export namespace AliasModule {
	export const { Location } = Module;
	export type Options = AliasModuleOptions;
	export type Context<StoreName extends ModuleKind = ModuleKind> = Module.Context<StoreName>;
	export type JSON = AliasModuleJSON;
	export type LocationJSON = Module.LocationJSON;
}
