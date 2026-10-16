import { basename, extname } from "node:path";
import { pathToFileURL } from "node:url";
import { type Awaitable } from "../../utilities/index";
import { MissingModuleError } from "../errors/MissingModuleError";
import type { Module } from "../modules/Module";
import type { ModuleStore } from "../modules/ModuleStore";
import type {
	AsyncPreloadResult,
	FilterResult,
	HydratedModuleData,
	ILoaderResult,
	ILoaderResultEntry,
	ModuleData,
	ModuleLoaderHooks,
} from "./contracts";
import { isModuleFile } from "./ModuleGlob";
import { classExtends, isClass } from "./Shared";

/** Import raw TypeScript modules with Bun. */
export class ModuleLoader<T extends Module> implements ModuleLoaderHooks<T> {
	public readonly supportedExtensions = [".ts"];

	public filter(path: string): FilterResult {
		if (!isModuleFile(path)) return null;
		// Retrieve the file extension.
		const extension = extname(path);
		if (!this.supportedExtensions.includes(extension)) return null;

		// Retrieve the name of the file, return null if empty.
		const name = basename(path, extension);
		if (name === "") return null;

		// Return the name and extension.
		return { extension, path, name };
	}

	public async preload(file: ModuleData): AsyncPreloadResult<T> {
		// Share an import when one file supplies several module kinds.
		const cached = file.imports?.get(file.path);
		if (cached) return cached;
		const imported = import(pathToFileURL(file.path).href);
		file.imports?.set(file.path, imported);
		return imported;
	}

	public async *load(
		store: ModuleStore<T>,
		file: HydratedModuleData,
	): ILoaderResult<T> {
		let yielded = false;
		const result = await this.preload(file);

		// Load each exported module class:
		for (const value of new Set(
			Object.keys(result)
				.sort()
				.map((key) => result[key]),
		)) {
			if (isClass(value) && classExtends(value, store.Constructor)) {
				yield value as ILoaderResultEntry<T>;
				yielded = true;
			}
		}

		if (!yielded) {
			throw new MissingModuleError(file.path);
		}
	}

	public onLoad(store: ModuleStore<T>, module: T): Awaitable<unknown>;
	public onLoad(): unknown {
		return undefined;
	}

	public onLoadAll(store: ModuleStore<T>): Awaitable<unknown>;
	public onLoadAll(): unknown {
		return undefined;
	}

	public onUnload(store: ModuleStore<T>, module: T): Awaitable<unknown>;
	public onUnload(): unknown {
		return undefined;
	}

	public onUnloadAll(store: ModuleStore<T>): Awaitable<unknown>;
	public onUnloadAll(): unknown {
		return undefined;
	}
}
