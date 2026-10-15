import type { Awaitable, Constructor, Ctor } from '../../utilities/index';
import type { Module } from '../modules/Module';
import type { ModuleStore } from '../modules/ModuleStore';

/** The module data information. */
export interface ModuleData {
	imports?: Map<string, Promise<any>>;
	/** The name of the module. */
	name: string;

	/** The absolute path to the module. */
	path: string;

	/** The extension of the module. */
	extension: string;
}

/** The hydrated module data. */
export interface HydratedModuleData extends ModuleData {
	/** The directory the module was loaded from. */
	root: string;
}

/** The result from the filter. */
export type FilterResult = ModuleData | null;

/** The return data from {@link ModuleLoaderHooks.preload} */
export type PreloadResult<T extends Module> = Awaitable<Constructor<T> & Record<PropertyKey, unknown>>;

/** The return data from {@link ModuleLoaderHooks.preload} */
export type AsyncPreloadResult<T extends Module> = Promise<Constructor<T> & Record<PropertyKey, unknown>>;

/** An entry from {@link ILoaderResult}. */
export type ILoaderResultEntry<T extends Module> = Ctor<ConstructorParameters<typeof Module>, T>;

/** The return data from {@link ModuleLoaderHooks.load}. */
export type ILoaderResult<T extends Module> = AsyncIterableIterator<ILoaderResultEntry<T>>;

/** An abstracted loader strategy interface. */
export interface ModuleLoaderHooks<T extends Module> {
	/** Get the name and the extension of the specified file path. */
	filter(path: string): FilterResult;

	/** The pre-load hook, use this to override the loader. */
	preload(file: ModuleData): PreloadResult<T>;

	/** The load hook, use this to override the loader. */
	load(store: ModuleStore<T>, file: HydratedModuleData): ILoaderResult<T>;

	/** Called after a module has been loaded, but before {@link Module.onLoad} and {@link ModuleStore.set}. */
	onLoad(store: ModuleStore<T>, module: T): Awaitable<unknown>;

	/** Called after all pieces have been loaded. */
	onLoadAll(store: ModuleStore<T>): Awaitable<unknown>;

	/** Called after a module has been unloaded or overwritten by a newly loaded module. */
	onUnload(store: ModuleStore<T>, module: T): Awaitable<unknown>;

	/** Called after all pieces have been unloaded. */
	onUnloadAll(store: ModuleStore<T>): Awaitable<unknown>;
}
