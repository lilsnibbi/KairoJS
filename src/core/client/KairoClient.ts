import type { Logger, LoggerOptions } from '@lilsnibbi/logger';
import { Client, type ClientOptions, type Message, type Snowflake } from 'discord.js';
import { ArgumentStore } from '../../commands/arguments/ArgumentStore';
// Load built-in pieces
import { loadArguments } from '../../commands/arguments/register';
import { CommandStore } from '../../commands/CommandStore';
import { PreconditionStore } from '../../commands/checks/PreconditionStore';
import { loadPreconditions } from '../../commands/checks/register';
import { BucketScope } from '../../commands/enums';
import { messageCommands } from '../../commands/message/listeners/register';
import { registerStatusListeners } from '../../commands/registration/listeners/register';
import { acquire } from '../../commands/registration/registries';
import { registerErrorListeners } from '../../events/errors/register';
import { Events } from '../../events/events';
import { InteractionHandlerStore } from '../../events/interactions/interactionHandlerStore';
import { ListenerStore } from '../../events/listenerStore';
import { registerEvents } from '../../events/register';
import { validateSchedulerOptions } from '../../extensions/scheduledTasks/timing';
import { ShardLink, shardConfig } from '../../sharding/client/Link';
import type { Awaitable } from '../../utilities/index';
import { type ExtensionOptions, resolveExtensions } from '../config/extensions';
import { clientOptionsSchema } from '../config/options';
import { Extension } from '../lifecycle/Extension';
import { ModuleGlob, moduleRoot } from '../loading/ModuleGlob';
import { createConsoleLogger } from '../logging/console';
import { writeEvent } from '../logging/diagnostics';
import type { ConsoleLogOptions } from '../logging/format';
import type { LoggerLike } from '../logging/LoggerLike';
import { container, ModuleRegistry, ModuleStore } from '../modules/index';
import type { ModulePaths } from '../modules/ModuleRegistry';

container.applicationCommandRegistries = { acquire };

/** A prefix string, a list of prefixes, or null for mentions only. */
export type Prefix = string | readonly string[] | null;

export type PrefixHook = (message: Message) => Awaitable<Prefix>;

export interface KairoClientOptions {
	/** Optional features, initialized in this order. */
	extensions?: ExtensionOptions;
	/** Base directory for module patterns. Defaults to cwd. */
	root?: string | URL;
	/** Bun glob patterns for each module kind. No folders are scanned implicitly. */
	modules?: ModulePaths;

	/** Whether commands can be case-insensitive
	 * @default false */
	caseInsensitiveCommands?: boolean | null;

	/** Whether prefixes can be case-insensitive
	 * @default false */
	caseInsensitivePrefixes?: boolean | null;

	/** The default prefix, in case of `null`, only mention prefix will trigger the bot's commands.
	 * @default null */
	defaultPrefix?: Prefix;

	/** The regex prefix, an alternative to a mention or regular prefix to allow creating natural language command messages */
	regexPrefix?: RegExp;

	/** The prefix hook, by default it is a callback function that returns {@link KairoClientOptions.defaultPrefix}.
	 * @default () => client.options.defaultPrefix */
	fetchPrefix?: PrefixHook;

	/** The client's ID, this is automatically set by the CoreReady event.
	 * @default this.client.user?.id ?? null */
	id?: Snowflake;

	/** Supply your logger instance directly. Its identity and settings are preserved. */
	logger?: LoggerLike;
	/** Used only when KairoJS creates its own logger. */
	loggerOptions?: Partial<LoggerOptions>;
	/** Formatting for the framework-created console logger. Supplied loggers are untouched. */
	logging?: ConsoleLogOptions;

	/** Log module discovery details through debug. Defaults to false. */
	traceModules?: boolean;

	/** Log application command registration status.
	 * @default true */
	logRegistrations?: boolean;

	/** Log framework errors with the client logger.
	 * @default true */
	logErrors?: boolean;

	/** Enable message command processing.
	 * @default false */
	messageCommands?: boolean;

	/** Controls whether the bot will automatically appear to be typing when a command is accepted.
	 * @default false */
	typing?: boolean;

	/** Set the default cooldown time for all commands.
	 * @default "No cooldown options" */
	defaultCooldown?: CooldownOptions;
	/** Controls whether the bot has mention as a prefix disabled
	 * @default false */
	disableMentionPrefix?: boolean;

	/** Whenever starting the bot process KairoJS may report errors when failing to fetch guild commands. */
	preventFailedToFetchLogForGuilds?: string[] | true;
}

type Disposer = () => Awaitable<unknown>;
interface FeatureState {
	extension: typeof Extension;
	disposers: Disposer[];
	removeModules: () => Promise<void>;
	restoreProperties: () => void;
	active: boolean;
}
let activeClient: KairoClient | undefined;

/** One active Discord client owns the shared services. */
export class KairoClient<Ready extends boolean = boolean> extends Client<Ready> {
	public override id: Snowflake | null = null;
	public override fetchPrefix: PrefixHook;
	public override logger: LoggerLike;
	public override modules: ModuleRegistry;
	public disableMentionPrefix?: boolean;
	public readonly extensions: readonly (typeof Extension)[];
	public readonly sharding: ShardLink;
	private closePromise?: Promise<void>;
	private loginPromise?: Promise<string>;
	private closed = false;
	private readonly disposers: Disposer[] = [];
	private readonly features: FeatureState[] = [];
	private readonly pendingCleanup: Promise<void>[] = [];
	private ownedLogger?: Logger;
	private currentFeature?: FeatureState;
	private phase?: Promise<void>;

	public constructor(options: ClientOptions) {
		clientOptionsSchema.assert(options);
		const managed = shardConfig();
		if (managed) {
			if (
				options.shards !== undefined ||
				options.shardCount !== undefined ||
				options.ws?.buildIdentifyThrottler ||
				options.ws?.buildStrategy
			)
				throw new TypeError('ShardManager owns shard IDs, count, strategy and identify throttling. Remove conflicting client options.');
			options = { ...options, shards: [managed.shard], shardCount: managed.count };
		}
		for (const key of [
			'baseUserDirectory',
			'plugins',
			'hmr',
			'api',
			'tasks',
			'i18n',
			'loadScheduledTaskErrorListeners',
			'loadSubcommandErrorListeners',
			'subcommandDefaultCooldown'
		])
			if (key in options) throw new TypeError(`KairoJS no longer supports "${key}". See BREAKING_CHANGES.md.`);
		const extensions = resolveExtensions(options.extensions);
		if (options.extensions?.scheduledtasks) validateSchedulerOptions(options.extensions.scheduledtasks);
		for (const [kind, feature] of Object.entries({ tasks: 'scheduledtasks', patterns: 'patternCommands', services: 'services' } as const))
			if (options.modules && kind in options.modules && options.extensions?.[feature] === false)
				throw new TypeError(`No module store is registered for "${kind}". Enable its extension first.`);
		for (const [kind, patterns] of Object.entries(options.modules ?? {})) {
			try {
				new ModuleGlob(moduleRoot(options.root), patterns);
			} catch (cause) {
				throw new TypeError(`Invalid module patterns for "${kind}".`, { cause });
			}
		}
		if (
			options.logger !== undefined &&
			(!options.logger || ['debug', 'notif', 'alert', 'error'].some((key) => typeof Reflect.get(options.logger!, key) !== 'function'))
		)
			throw new TypeError('logger must provide debug, notif, alert and error methods. Pass an existing instance directly.');
		if (activeClient) throw new Error('Only one KairoClient can be active. Await client.destroy() before creating another.');
		super(options);
		this.extensions = extensions;
		this.logger = options.logger ?? (this.ownedLogger = createConsoleLogger('KairoJS', options.loggerOptions, options.logging));
		this.sharding = new ShardLink(managed, async (code, cause) => {
			if (code !== 0)
				writeEvent(this.logger, 'error', {
					component: 'sharding.client',
					event: 'managed_shard_stopped',
					message: 'Stopping this shard after a supervisor or coordination failure; inspect the host logs.',
					error: cause,
					context: { code }
				});
			await this.destroy();
		});
		if (managed) {
			this.options.ws ??= {};
			this.options.ws.buildIdentifyThrottler = () => ({ waitForIdentify: (id, signal) => this.sharding.waitForIdentify(id, signal) });
			this.on('shardReady', () => this.sharding.identified());
		}
		this.modules = new ModuleRegistry();
		this.modules.onFailure = () => this.destroy();
		this.fetchPrefix = options.fetchPrefix ?? (() => this.options.defaultPrefix ?? null);
		this.disableMentionPrefix = options.disableMentionPrefix;
		this.id = options.id ?? null;
		activeClient = this;
		container.client = this;
		container.modules = this.modules;
		container.logger = this.logger;
		ModuleStore.logger = options.traceModules
			? (value) => writeEvent(this.logger, 'debug', { component: 'modules', event: 'module_trace', message: value })
			: null;
		try {
			loadArguments();
			registerEvents();
			loadPreconditions();
			this.modules
				.register(new ArgumentStore())
				.register(new CommandStore())
				.register(new InteractionHandlerStore())
				.register(new ListenerStore())
				.register(new PreconditionStore());
			if (options.logRegistrations !== false) registerStatusListeners();
			if (options.logErrors !== false) registerErrorListeners();
			if (options.messageCommands === true) messageCommands();
			for (const extension of this.extensions) this.setupFeature(extension);
			this.modules.configure(options.modules, options.root);
			this.modules.beforeLoad = async () => {
				await Promise.all(this.pendingCleanup);
				this.assertOpen();
			};
		} catch (error) {
			void this.destroy().catch((cleanup) =>
				writeEvent(this.logger, 'error', {
					component: 'client',
					event: 'construction_cleanup_failed',
					message: 'Startup rollback could not release all client resources; inspect the cleanup cause.',
					error: cleanup
				})
			);
			throw error;
		}
	}

	/** Load configured TypeScript modules once. Connections start at login. */
	public load(): Promise<void> {
		if (this.closed) return Promise.reject(new Error('This KairoClient is closed.'));
		return this.modules.load();
	}

	public override login(token?: string): Promise<string> {
		if (this.closed) return Promise.reject(new Error('This KairoClient is closed.'));
		this.loginPromise ??= this.connect(token);
		return this.loginPromise;
	}

	private async connect(token?: string): Promise<string> {
		try {
			await this.load();
			this.assertOpen();
			if (this.sharding.enabled) await this.sharding.connect();
			this.assertOpen();
			await this.runFeatures('beforeLogin');
			this.assertOpen();
			const result = await super.login(token);
			this.assertOpen();
			await this.runFeatures('afterLogin');
			this.assertOpen();
			return result;
		} catch (error) {
			try {
				await this.destroy();
			} catch (cleanup) {
				throw new AggregateError([error, cleanup], 'Login and cleanup failed.');
			}
			throw error;
		}
	}

	/** Own a resource so failed hooks and shutdown can release it. */
	public addDisposer(dispose: Disposer): void {
		this.assertOpen();
		(this.currentFeature?.disposers ?? this.disposers).push(dispose);
	}

	private setupFeature(extension: typeof Extension): void {
		const finishRegistration = this.modules.trackRegistrations();
		const objects = [this, container];
		const before = objects.map((object) => Object.getOwnPropertyDescriptors(object));
		const state: FeatureState = { extension, active: true, disposers: [], removeModules: async () => {}, restoreProperties: () => {} };
		this.features.push(state);
		this.currentFeature = state;
		let failure: unknown;
		let failed = false;
		try {
			extension.setup(this);
			this.emit(Events.ExtensionLoaded, 'setup', extension.name);
		} catch (error) {
			failure = error;
			failed = true;
		} finally {
			this.currentFeature = undefined;
			state.removeModules = finishRegistration();
			const after = objects.map((object) => Object.getOwnPropertyDescriptors(object));
			state.restoreProperties = () =>
				objects.forEach((object, index) => {
					for (const key of Reflect.ownKeys(after[index])) {
						const previous = Reflect.get(before[index], key) as PropertyDescriptor | undefined;
						const assigned = Reflect.get(after[index], key) as PropertyDescriptor;
						const current = Object.getOwnPropertyDescriptor(object, key);
						if (!current || current.value !== assigned.value || current.get !== assigned.get || current.set !== assigned.set) continue;
						if (previous) Object.defineProperty(object, key, previous);
						else Reflect.deleteProperty(object, key);
					}
				});
		}
		if (failed) {
			writeEvent(this.logger, 'error', {
				component: 'extensions',
				event: 'setup_failed',
				message: extension.critical
					? 'Required extension setup failed; client startup cannot continue.'
					: 'Optional extension setup failed; disabling it and removing its registrations.',
				error: failure,
				context: { extension: extension.name, critical: !!extension.critical }
			});
			const cleanup = this.disableFeature(state);
			this.pendingCleanup.push(cleanup);
			void cleanup.catch(() => {});
			if (extension.critical) throw new Error(`Required extension ${extension.name} failed.`, { cause: failure });
		}
	}

	private async runFeatures(phase: 'beforeLogin' | 'afterLogin'): Promise<void> {
		for (const state of this.features) {
			if (!state.active) continue;
			this.assertOpen();
			this.currentFeature = state;
			try {
				this.phase = Promise.resolve().then(() => state.extension[phase](this));
				await this.phase;
				this.emit(Events.ExtensionLoaded, phase, state.extension.name);
			} catch (cause) {
				writeEvent(this.logger, 'error', {
					component: 'extensions',
					event: 'hook_failed',
					message: state.extension.critical
						? 'Required extension login hook failed; client startup cannot continue.'
						: 'Optional extension login hook failed; disabling it and releasing its resources.',
					error: cause,
					context: { extension: state.extension.name, phase, critical: !!state.extension.critical }
				});
				await this.disableFeature(state);
				if (state.extension.critical) throw new Error(`Required extension ${state.extension.name} failed during ${phase}.`, { cause });
			} finally {
				this.currentFeature = undefined;
				this.phase = undefined;
			}
		}
	}

	private async disableFeature(state: FeatureState): Promise<void> {
		state.active = false;
		const errors: unknown[] = [];
		for (const dispose of state.disposers.splice(0).reverse())
			try {
				await dispose();
			} catch (error) {
				errors.push(error);
			}
		try {
			await state.removeModules();
		} catch (error) {
			errors.push(error);
		}
		state.restoreProperties();
		if (errors.length) throw new AggregateError(errors, `Could not clean up extension ${state.extension.name}.`);
	}

	public override destroy(): Promise<void> {
		this.closed = true;
		this.closePromise ??= this.close();
		return this.closePromise;
	}

	private async close(): Promise<void> {
		const errors: unknown[] = [];
		try {
			await this.sharding.close();
		} catch (error) {
			errors.push(error);
		}
		await this.phase?.catch(() => {});
		for (const result of await Promise.allSettled(this.pendingCleanup)) if (result.status === 'rejected') errors.push(result.reason);
		// Close producers before unloading the modules they call.
		const disposers = [...this.disposers.splice(0), ...this.features.flatMap((state) => state.disposers.splice(0))];
		for (const dispose of disposers.reverse())
			try {
				await dispose();
			} catch (error) {
				errors.push(error);
			}
		await this.modules.idle();
		for (const result of await Promise.allSettled([...this.modules.values()].map((store) => store.unloadAll())))
			if (result.status === 'rejected') errors.push(result.reason);
		try {
			await super.destroy();
		} catch (error) {
			errors.push(error);
		}
		try {
			await this.ownedLogger?.close();
		} catch (error) {
			errors.push(error);
		}
		if (container.client === this) {
			for (const key of ['client', 'i18n', 'tasks', 'services'] as const) Reflect.deleteProperty(container, key);
			ModuleStore.logger = null;
		}
		if (activeClient === this) activeClient = undefined;
		if (errors.length) throw new AggregateError(errors, 'Some KairoJS features could not close.');
	}

	private assertOpen(): void {
		if (this.closed) throw new Error('This KairoClient is closed.');
	}
}

export interface CooldownOptions {
	scope?: BucketScope;
	delay?: number;
	limit?: number;
	filteredUsers?: Snowflake[];
	filteredCommands?: string[];
}

declare module 'discord.js' {
	interface Client {
		id: Snowflake | null;
		logger: LoggerLike;
		modules: ModuleRegistry;
		fetchPrefix: PrefixHook;
	}

	interface ClientOptions extends KairoClientOptions {}
}
