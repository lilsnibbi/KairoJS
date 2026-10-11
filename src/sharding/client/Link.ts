import { type } from 'arktype';
import { ShardMessenger } from '../messaging';
import { Pending } from '../transport/pending';
import { decode, encode, type Frame, failure, frame, identifier, type Limits, limits, timeout } from '../transport/protocol';
import { type ShardCallOptions, type ShardContext, ShardError, type ShardInput, type ShardOutput, type ShardRequestName } from '../types';

export interface ShardConfig {
	shard: number;
	count: number;
	generation: string;
	limits: Limits;
	identifyTimeoutMs: number;
	shutdownTimeoutMs: number;
}
/** Called only by KairoClient; ordinary clients never read transport credentials or open connections. */
export function shardConfig(): ShardConfig | undefined {
	const input = process.env.KAIRO_SHARD;
	if (input === undefined) return undefined;
	if (!process.send || !process.connected)
		throw new ShardError('CONFIG', 'KAIRO_SHARD is reserved for ShardManager-owned Bun IPC children.');
	if (Buffer.byteLength(input) > 8192) throw new ShardError('CONFIG', 'Invalid managed shard configuration.');
	const result = type({
		shard: 'number.integer >= 0',
		count: 'number.integer > 0 & number <= 4096',
		generation: identifier,
		limits: 'object',
		identifyTimeoutMs: 'number',
		shutdownTimeoutMs: 'number',
		'+': 'reject'
	}).assert(JSON.parse(input));
	if (result.shard >= result.count) throw new ShardError('CONFIG', 'Shard ID exceeds total count.');
	return {
		...result,
		limits: limits(result.limits),
		identifyTimeoutMs: timeout(result.identifyTimeoutMs),
		shutdownTimeoutMs: timeout(result.shutdownTimeoutMs)
	};
}
interface Handler {
	run: (input: any, context: ShardContext) => unknown;
	validate?: (input: unknown) => unknown;
}
interface Active {
	controller: AbortController;
	timer: ReturnType<typeof setTimeout>;
	task: Promise<void>;
}

/** Typed messaging on one managed KairoClient. Handlers run local registered code only. */
export class ShardLink extends ShardMessenger {
	private readonly handlers = new Map<string, Handler>();
	private readonly active = new Map<string, Active>();
	private readonly requests: Pending;
	private readonly policy: Limits;
	private started = false;
	private connected = false;
	private closed = false;
	private connectPromise?: Promise<void>;
	private closePromise?: Promise<void>;
	private heartbeat?: ReturnType<typeof setInterval>;
	private lastSeen = 0;
	private stopPromise?: Promise<void>;
	public constructor(
		private readonly config: ShardConfig | undefined,
		private readonly shutdown: (code: number, cause?: unknown) => Promise<void>
	) {
		super();
		this.policy = config?.limits ?? limits();
		this.requests = new Pending(this.policy.maxPending);
	}
	public get enabled(): boolean {
		return this.config !== undefined;
	}
	public get isConnected(): boolean {
		return this.connected;
	}
	public get id(): number | null {
		return this.config?.shard ?? null;
	}
	public override get shardCount(): number {
		return this.config?.count ?? 0;
	}
	public get pendingCount(): number {
		return this.requests.size;
	}
	/** First handler wins. Unsubscribe affects future invocations; existing work keeps its handler. */
	public handle<K extends ShardRequestName>(
		name: K,
		handler: (input: ShardInput<K>, context: ShardContext) => ShardOutput<K> | Promise<ShardOutput<K>>,
		validate?: (input: unknown) => ShardInput<K>
	): () => void {
		identifier.assert(name);
		if (this.closed) throw new ShardError('CLOSED', 'Sharding is closed.');
		if (this.handlers.has(name)) throw new ShardError('DUPLICATE_HANDLER', `Handler ${name} is already registered.`);
		if (typeof handler !== 'function' || (validate !== undefined && typeof validate !== 'function'))
			throw new TypeError('Handler and validator must be functions.');
		const entry = { run: handler, validate };
		this.handlers.set(name, entry);
		return () => {
			if (this.handlers.get(name) === entry) this.handlers.delete(name);
		};
	}
	/** Normally called by login. Explicit connect supports transport-only processes without Discord login. */
	public connect(): Promise<void> {
		if (!this.config) return Promise.reject(new ShardError('DISABLED', 'This client is not a ShardManager child.'));
		if (this.closed) return Promise.reject(new ShardError('CLOSED', 'Sharding is closed.'));
		if (!this.connectPromise) {
			this.started = true;
			this.lastSeen = performance.now();
			process.on('message', this.onMessage);
			process.on('disconnect', this.onDisconnect);
			process.on('SIGTERM', this.onSignal);
			this.heartbeat = setInterval(() => {
				if (performance.now() - this.lastSeen > 15000) void this.stop(1);
			}, 3000);
			this.connectPromise = this.rpc(frame('boot'), {}).then(() => {
				if (this.closed) throw new ShardError('CLOSED', 'Closed during handshake.');
				this.connected = true;
			});
		}
		return this.connectPromise;
	}
	protected override async call(target: number, name: string, payload: unknown, options: ShardCallOptions): Promise<unknown> {
		if (!this.connected) throw new ShardError('DISCONNECTED', 'Sharding is not connected.');
		if (!Number.isInteger(target) || target < 0 || target >= this.shardCount)
			throw new ShardError('TARGET', 'Shard is outside the configured range.');
		identifier.assert(name);
		return this.rpc(
			frame('call', undefined, { source: this.id, target, name, payload, timeoutMs: timeout(options.timeoutMs ?? this.policy.timeoutMs) }),
			options
		);
	}
	/** Used by discord.js for every IDENTIFY, including re-identification after reconnects. */
	public async waitForIdentify(shard: number, signal: AbortSignal): Promise<void> {
		try {
			if (shard !== this.id || !this.connected) throw new ShardError('IDENTIFY', 'No owned connected shard for this identify.');
			await this.rpc(
				frame('identify', undefined, { shard, generation: this.config!.generation, timeoutMs: this.config!.identifyTimeoutMs }),
				{ signal, timeoutMs: this.config!.identifyTimeoutMs }
			);
		} catch (error) {
			// discord.js 14's throttler catch can fall through to IDENTIFY after a non-abort failure.
			// A managed process must stop before returning such a failure to that hook.
			if (!signal.aborted) await this.stop(1, error);
			throw error;
		}
		signal.throwIfAborted();
	}
	/** READY acknowledges actual identification; the coordinator then starts the bucket cooldown. */
	public identified(): void {
		if (this.connected && !this.closed) {
			try {
				this.send(frame('done', undefined, { shard: this.id, generation: this.config!.generation }));
			} catch (error) {
				void this.stop(1, error);
			}
		}
	}
	private async rpc(message: Frame, options: ShardCallOptions): Promise<unknown> {
		if (!this.started || this.closed) throw new ShardError('DISCONNECTED', 'Shard IPC is closed.');
		encode(message, this.policy.maxBytes);
		const promise = this.requests.create(message.id, options.timeoutMs ?? this.policy.timeoutMs, options.signal, () => {
			try {
				this.send(frame('cancel', message.id));
			} catch {
				/* Parent may have disconnected. */
			}
		});
		if (this.requests.has(message.id)) {
			try {
				this.send(message);
			} catch (error) {
				this.requests.reject(message.id, error);
			}
		}
		return promise;
	}
	private readonly onMessage = (input: unknown): void => {
		try {
			const message = decode(input, this.policy.maxBytes, ['ping', 'stop', 'reply', 'invoke', 'cancel']);
			this.lastSeen = performance.now();
			switch (message.op) {
				case 'ping':
					this.send(frame('pong', message.id));
					return;
				case 'stop':
					void this.stop(0);
					return;
				case 'reply':
					if (message.data.ok) this.requests.resolve(message.id, message.data.value);
					else this.requests.reject(message.id, new ShardError(message.data.error.code, message.data.error.message));
					return;
				case 'cancel':
					this.active.get(message.id)?.controller.abort(new ShardError('ABORTED', 'Caller cancelled or timed out.'));
					return;
				case 'invoke':
					this.invoke(message);
					return;
			}
		} catch (error) {
			void this.stop(1, error);
		}
	};
	private readonly onDisconnect = (): void => {
		void this.stop(1);
	};
	private readonly onSignal = (): void => {
		void this.stop(0);
	};
	private invoke(message: Frame): void {
		if (!this.connected || this.closed || message.data.target !== this.id || message.data.generation !== this.config!.generation)
			throw new ShardError('PROTOCOL', 'Invocation targets a different process.');
		if (this.active.has(message.id)) throw new ShardError('PROTOCOL', 'Duplicate invocation.');
		const handler = this.handlers.get(message.data.name);
		const reply = (result: unknown) => {
			if (!this.closed) this.send(frame('result', message.id, { shard: this.id, generation: this.config!.generation, result }));
		};
		if (!handler || this.active.size >= this.policy.maxPending) {
			reply(
				failure(
					new ShardError(
						handler ? 'CAPACITY' : 'NO_HANDLER',
						handler ? 'Handler capacity reached.' : `Unknown handler ${message.data.name}.`
					)
				)
			);
			return;
		}
		const controller = new AbortController();
		const timer = setTimeout(
			() => controller.abort(new ShardError('TIMEOUT', 'Handler deadline elapsed.')),
			timeout(message.data.timeoutMs)
		);
		const task = Promise.resolve()
			.then(async () => {
				try {
					const input = handler.validate ? handler.validate(message.data.payload) : message.data.payload;
					const value = await handler.run(input, {
						source: message.data.source === -1 ? null : message.data.source,
						signal: controller.signal
					});
					if (!controller.signal.aborted) reply({ ok: true, value });
				} catch (error) {
					if (!controller.signal.aborted) reply(failure(error));
				}
			})
			.catch(() => {
				void this.stop(1);
			})
			.finally(() => {
				clearTimeout(timer);
				this.active.delete(message.id);
			});
		// Keep abandoned/hung handlers counted until they actually finish, preventing unbounded work.
		this.active.set(message.id, { controller, timer, task });
	}
	private send(message: Frame): void {
		if (!process.connected || !process.send) throw new ShardError('DISCONNECTED', 'Parent IPC is disconnected.');
		process.send(encode(message, this.policy.maxBytes));
	}
	private stop(code: number, cause?: unknown): Promise<void> {
		return (this.stopPromise ??= (async () => {
			const deadline = setTimeout(() => process.exit(1), this.config?.shutdownTimeoutMs ?? 5000);
			try {
				await this.shutdown(code, cause);
			} catch {
				code = 1;
			}
			clearTimeout(deadline);
			// Managed children explicitly give their supervisor process-lifecycle ownership.
			process.exit(code);
		})());
	}
	public close(): Promise<void> {
		this.closed = true;
		this.connected = false;
		return (this.closePromise ??= this.finish());
	}
	private async finish(): Promise<void> {
		clearInterval(this.heartbeat);
		process.off('message', this.onMessage);
		process.off('disconnect', this.onDisconnect);
		process.off('SIGTERM', this.onSignal);
		this.requests.close();
		this.handlers.clear();
		for (const entry of this.active.values()) {
			clearTimeout(entry.timer);
			entry.controller.abort(new ShardError('CLOSED', 'Client closing.'));
		}
		if (this.active.size) {
			let timer: ReturnType<typeof setTimeout> | undefined;
			try {
				await Promise.race([
					Promise.allSettled([...this.active.values()].map((v) => v.task)),
					new Promise<void>((done) => {
						timer = setTimeout(done, Math.min(1000, this.config?.shutdownTimeoutMs ?? 1000));
					})
				]);
			} finally {
				clearTimeout(timer);
			}
		}
		if (this.started && process.connected) process.disconnect?.();
	}
}
