import type { Awaitable } from '../../utilities/index';
import { type Container, container } from '../Container';
import { ModuleLocation, type ModuleLocationJSON } from './ModuleLocation';
import type { ModuleKind, StoreFor } from './ModuleRegistry';
import type { ModuleStore } from './ModuleStore';

/** The context for the module, contains extra information from the store, the module's path, and the store that loaded it. */
export interface ModuleContext<StoreName extends ModuleKind = ModuleKind> {
	/** The root directory the module was loaded from. */
	readonly root: string;

	/** The path the module was loaded from, relative to {@link ModuleContext.root}. */
	readonly path: string;

	/** The module's name extracted from the path. */
	readonly name: string;

	/** The store that loaded the module. */
	readonly store: StoreFor<StoreName>;
}

/** The options for the {@link Module}. */
export interface ModuleOptions {
	/** The name for the module.
	 * @default '' */
	readonly name?: string;

	/** Whether the module should be enabled. If set to false, the module will be unloaded.
	 * @default true */
	readonly enabled?: boolean;
}

/** The module to be stored in {@link ModuleStore} instances. */
export class Module<Options extends ModuleOptions = ModuleOptions, StoreName extends ModuleKind = ModuleKind> {
	/** Optional class metadata, passed as constructor options by the loader. */
	public static readonly options?: ModuleOptions;
	/** The store that contains the module. */
	public readonly store: StoreFor<StoreName>;

	/** The location metadata for the module's file. */
	public readonly location: ModuleLocation;

	/** The name of the module. */
	public readonly name: string;

	/** Whether the module is enabled. */
	public enabled: boolean;

	/** The raw options passed to this {@link Module} */
	public readonly options: Options;

	public constructor(context: Module.Context<StoreName>, options: ModuleOptions = {}) {
		this.store = context.store;
		this.location = new ModuleLocation(context.path, context.root);
		this.name = options.name ?? context.name;
		this.enabled = options.enabled ?? true;
		this.options = options as Options;
	}

	/** A reference to the {@link Container} object for ease of use. */
	public get container(): Container {
		return container;
	}

	/** Per-module listener that is called when the module is loaded into the store. Useful to set-up asynchronous initialization tasks. */
	public onLoad(): Awaitable<unknown> {
		return undefined;
	}

	/** Per-module listener that is called when the module is unloaded from the store. Useful to set-up clean-up tasks. */
	public onUnload(): Awaitable<unknown> {
		return undefined;
	}

	/** Unloads and disables the module. */
	public async unload() {
		if (this.store.get(this.name) === this) await (this.store as ModuleStore<Module>).unload(this);
		this.enabled = false;
	}

	/** Defines the `JSON.stringify` behavior of this module. */
	public toJSON(): ModuleJSON {
		return {
			location: this.location.toJSON(),
			name: this.name,
			enabled: this.enabled,
			options: this.options
		};
	}
}

/** The return type of {@link Module.toJSON}. */
export interface ModuleJSON {
	location: ModuleLocationJSON;
	name: string;
	enabled: boolean;
	options: ModuleOptions;
}

export namespace Module {
	export const Location = ModuleLocation;
	export type Options = ModuleOptions;
	export type Context<StoreName extends ModuleKind = ModuleKind> = ModuleContext<StoreName>;
	export type JSON = ModuleJSON;
	export type LocationJSON = ModuleLocationJSON;
}
