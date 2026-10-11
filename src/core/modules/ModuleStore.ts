import { Collection } from '@discordjs/collection';
import { type AbstractConstructor, type Constructor, classExtends, isClass } from '../../utilities/index';
import { type Container, container } from '../Container';
import { ModuleCleanupError } from '../errors/ModuleCleanupError';
import { ModuleLoadError, ModuleLoadErrorType } from '../errors/ModuleLoadError';
import { RegisteredModules, VirtualPath } from '../loading/constants';
import type { HydratedModuleData, ILoaderResultEntry, ModuleLoaderHooks } from '../loading/contracts';
import { ModuleLoader } from '../loading/ModuleLoader';
import { writeLog } from '../logging/diagnostics';
import type { Module } from './Module';
import { type ModuleKind, ModuleRegistry, type ModuleStores } from './ModuleRegistry';

export interface ModuleStoreOptions<T extends Module, StoreName extends ModuleKind = ModuleKind> {
	readonly name: StoreName;
	readonly strategy?: ModuleLoaderHooks<T>;
}
export type ModuleStoreLogger = (value: string) => void;

/** Owns the modules of one kind and awaits their lifecycle hooks. */
export class ModuleStore<T extends Module, StoreName extends ModuleKind = ModuleKind> extends Collection<string, T> {
	public readonly Constructor: AbstractConstructor<T>;
	public readonly name: StoreName;
	public readonly strategy: ModuleLoaderHooks<T>;
	private readonly [RegisteredModules] = new Map<string, ModuleRegistration<StoreName>>();
	#loaded = false;
	#initialization?: Promise<void>;
	readonly #insertions = new Map<string, Promise<T>>();
	readonly #unloads = new WeakMap<T, Promise<T>>();

	constructor(pieceConstructor: AbstractConstructor<T>, options: ModuleStoreOptions<T, StoreName>) {
		super();
		this.Constructor = pieceConstructor;
		this.name = options.name;
		this.strategy = options.strategy ?? ModuleStore.defaultStrategy;
	}
	get container(): Container {
		return container;
	}

	/** Register a class directly. Built-ins use this too. */
	async addModule(entry: ModuleRegistration<StoreName>): Promise<void> {
		if (!isClass(entry.module) || !classExtends(entry.module, this.Constructor as Constructor<T>))
			throw new TypeError(`Module "${entry.name}" must extend ${this.Constructor.name}.`);
		if (this.#loaded)
			await this.insert(
				this.construct(entry.module as unknown as Constructor<T>, { name: entry.name, root: VirtualPath, path: VirtualPath, extension: '' })
			);
		if (!this[RegisteredModules].has(entry.name)) this[RegisteredModules].set(entry.name, { ...entry });
		else this.warnDuplicate(entry.name, 'explicit registration');
	}

	/** Stage candidates in registration, file and export-name order. */
	async prepare(files: string[], root: string, imports = new Map<string, Promise<any>>()): Promise<T[]> {
		const modules: T[] = [];
		for (const entry of this[RegisteredModules].values()) {
			try {
				modules.push(
					this.construct(entry.module as unknown as Constructor<T>, {
						name: entry.name,
						root: VirtualPath,
						path: VirtualPath,
						extension: ''
					})
				);
			} catch (cause) {
				this.report(entry.name, cause);
			}
		}
		for (const file of files) modules.push(...(await this.prepareFile(root, file, imports)));
		return modules;
	}

	private async prepareFile(root: string, path: string, imports: Map<string, Promise<any>>): Promise<T[]> {
		const data = this.strategy.filter(path);
		if (!data) return [];
		const modules: T[] = [];
		try {
			for await (const Ctor of this.strategy.load(this, { root, ...data, imports })) {
				try {
					modules.push(this.construct(Ctor, { root, ...data }));
				} catch (cause) {
					this.report(path, cause);
				}
			}
		} catch (cause) {
			this.report(path, cause);
		}
		return modules;
	}

	/** Activate once. Bad modules are isolated; failed cleanup remains fatal. */
	initialize(modules: T[]): Promise<void> {
		this.#initialization ??= Promise.resolve().then(async () => {
			for (const module of modules) {
				try {
					await this.insert(module);
				} catch (cause) {
					if (cause instanceof ModuleCleanupError) throw cause;
					this.report(module.location.full, cause);
				}
			}
			await this.strategy.onLoadAll(this);
			this.#loaded = true;
		});
		return this.#initialization;
	}

	private report(source: string, cause: unknown): void {
		if (container.logger) writeLog(container.logger, 'error', `Skipping ${this.name} module from "${source}".`, cause);
	}

	private warnDuplicate(name: string, source: string): void {
		container.logger?.alert(`Duplicate ${this.name} module "${name}" from ${source}; keeping the first accepted module.`);
	}

	async unload(name: string | T): Promise<T> {
		const module = this.resolve(name);
		let pending = this.#unloads.get(module);
		if (!pending) {
			pending = Promise.resolve().then(() => this.unloadModule(module));
			this.#unloads.set(module, pending);
		}
		return pending;
	}

	private async unloadModule(module: T): Promise<T> {
		const errors: unknown[] = [];
		try {
			await this.strategy.onUnload(this, module);
		} catch (error) {
			errors.push(error);
		}
		try {
			await module.onUnload();
		} catch (error) {
			errors.push(error);
		}
		if (super.get(module.name) === module) this.delete(module.name);
		if (errors.length) throw new AggregateError(errors, `Could not unload module "${module.name}".`);
		if (Object.is(container.modules.get(this.name), this)) container.client?.emit('moduleUnloaded', this, module);
		return module;
	}

	async unloadAll(): Promise<T[]> {
		// Runtime registrations may still be activating when the client starts closing.
		await Promise.allSettled([...this.#insertions.values()]);
		const results = await Promise.allSettled([...this.values()].map((module) => this.unload(module)));
		const errors = results.filter((result) => result.status === 'rejected').map((result) => result.reason);
		try {
			await this.strategy.onUnloadAll(this);
		} catch (error) {
			errors.push(error);
		}
		if (errors.length) throw new AggregateError(errors, `Could not unload every module in ${this.name}.`);
		return results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
	}

	resolve(name: string | T): T {
		if (typeof name === 'string') {
			const module = this.get(name);
			if (!module) throw new ModuleLoadError(ModuleLoadErrorType.MissingModule, `Module "${name}" does not exist.`);
			return module;
		}
		if (name instanceof this.Constructor) return name;
		throw new ModuleLoadError(ModuleLoadErrorType.IncorrectType, `Expected an instance of ${this.Constructor.name}`);
	}

	insert(module: T): Promise<T> {
		const previous = this.#insertions.get(module.name) ?? Promise.resolve();
		const pending = previous
			.catch((cause) => {
				if (cause instanceof ModuleCleanupError) throw cause;
			})
			.then(() => this.activate(module));
		this.#insertions.set(module.name, pending);
		void pending
			.finally(() => {
				if (this.#insertions.get(module.name) === pending) this.#insertions.delete(module.name);
			})
			.catch(() => {});
		return pending;
	}

	private async activate(module: T): Promise<T> {
		const previous = super.get(module.name);
		if (previous && this.#unloads.has(previous)) {
			await this.#unloads.get(previous);
			return this.activate(module);
		}
		if (previous === module) return module;
		if (previous) {
			this.warnDuplicate(module.name, module.location.full);
			return previous;
		}
		if (!module.enabled) return module;
		this.#unloads.delete(module);
		try {
			await this.strategy.onLoad(this, module);
			await module.onLoad();
			if (!module.enabled) {
				await this.unload(module);
				return module;
			}
			this.set(module.name, module);
			if (Object.is(container.modules.get(this.name), this)) container.client?.emit('moduleLoaded', this, module);
			ModuleStore.logger?.(`Loaded ${this.name}/${module.name}`);
			return module;
		} catch (cause) {
			const errors: unknown[] = [cause];
			try {
				await this.unload(module);
			} catch (error) {
				errors.push(error);
			}
			if (errors.length > 1) throw new ModuleCleanupError(errors, 'Module activation and cleanup both failed.');
			throw new AggregateError(errors, `Could not activate module "${module.name}".`);
		}
	}

	construct(Ctor: ILoaderResultEntry<T>, data: HydratedModuleData): T {
		const context = { store: this as unknown as Module.Context['store'], root: data.root, path: data.path, name: data.name };
		const metadata = Reflect.get(Ctor, 'options');
		const module = Reflect.construct(Ctor, metadata === undefined ? [context] : [context, metadata]) as T;
		if (typeof module.name !== 'string' || !module.name.trim()) throw new TypeError('Module names must be non-empty strings.');
		return module;
	}
	static defaultStrategy: ModuleLoaderHooks<any> = new ModuleLoader();
	static logger: ModuleStoreLogger | null = null;
}

export interface ModuleRegistration<StoreName extends ModuleKind> {
	name: string;
	module: ModuleStores[StoreName] extends ModuleStore<infer Module> ? Constructor<Module> : never;
}
export namespace ModuleStore {
	export const Registry = ModuleRegistry;
	export type Options<T extends Module> = ModuleStoreOptions<T>;
	export type Logger = ModuleStoreLogger;
	export type RegistryEntries = ModuleStores;
}
