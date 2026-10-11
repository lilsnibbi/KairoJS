import type { EventEmitter } from 'node:events';
import type { Client, ClientEvents } from 'discord.js';
import { Module } from '../core/modules/index';
import { Result } from '../utilities/result/index';
import { Events } from './events';

/** Extend this class to handle an event from an emitter. */
export abstract class Listener<
	E extends keyof ClientEvents | symbol = '',
	Options extends Listener.Options = Listener.Options
> extends Module<Options, 'listeners'> {
	public static override readonly options?: Listener.Options;
	/** The emitter, if any. */
	public readonly emitter: EventEmitter | null;

	/** The name of the event the listener listens to. */
	public readonly event: string | symbol;

	/** Whether the listener will be unloaded after the first run. */
	public readonly once: boolean;

	private _listener: ((...args: any[]) => void) | null;

	public constructor(context: Listener.Context, options: Options = {} as Options) {
		super(context, options);

		this.emitter =
			typeof options.emitter === 'undefined'
				? this.container.client
				: ((typeof options.emitter === 'string'
						? (Reflect.get(this.container.client, options.emitter) as EventEmitter)
						: (options.emitter as EventEmitter)) ?? null);
		this.event = options.event ?? this.name;
		this.once = options.once ?? false;

		this._listener = this.emitter && this.event ? (this.once ? this._runOnce.bind(this) : this._run.bind(this)) : null;

		// If there's no emitter or no listener, disable:
		if (this.emitter === null || this._listener === null) this.enabled = false;
	}

	public abstract run(...args: E extends keyof ClientEvents ? ClientEvents[E] : unknown[]): unknown;

	public override toJSON(): ListenerJSON {
		return {
			...super.toJSON(),
			once: this.once,
			event: this.event
		};
	}

	private async _run(...args: unknown[]) {
		const result = await Result.fromAsync(() => this.run(...(args as E extends keyof ClientEvents ? ClientEvents[E] : unknown[])));
		result.inspectErr((error) => this.container.client.emit(Events.ListenerError, error, { module: this }));
	}

	private async _runOnce(...args: unknown[]) {
		await this._run(...args);
		await this.unload();
	}
}

export interface ListenerOptions extends Module.Options {
	readonly emitter?: keyof Client | EventEmitter;
	readonly event?: string | symbol;
	readonly once?: boolean;
}

export interface ListenerJSON extends Module.JSON {
	event: string | symbol;
	once: boolean;
}

export namespace Listener {
	export type Options = ListenerOptions;
	export type JSON = ListenerJSON;
	export type Context = Module.Context<'listeners'>;
}
