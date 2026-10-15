// Modified host-supervision design from discord-sharding. Apache-2.0; see ../LICENSE.

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Logger } from '@lilsnibbi/logger';
import { type } from 'arktype';
import { createConsoleLogger } from '../../core/logging/console';
import { writeEvent } from '../../core/logging/diagnostics';
import { ShardMessenger } from '../messaging';
import { Pending } from '../transport/pending';
import {
	decode,
	encode,
	type Frame,
	failure,
	frame,
	identifier,
	type Limits,
	limits,
	loopback,
	sendSocket,
	timeout,
	validateToken
} from '../transport/protocol';
import { type NativeSocket, Socket } from '../transport/socket';
import { type ShardCallOptions, ShardError, type ShardManagerOptions, type ShardProcessStatus } from '../types';

interface Child {
	shard: number;
	generation: string;
	process: Bun.Subprocess;
	status: ShardProcessStatus;
	started: number;
	lastSeen: number;
	intentional: boolean;
	ready: boolean;
	requests: Map<string, AbortController>;
	stop?: Promise<void>;
	startup: ReturnType<typeof setTimeout>;
}
interface Inbound {
	child: Child;
	timer: ReturnType<typeof setTimeout>;
}

/** Runs on each deployment host; owns only the Bun children it spawns. */
export class ShardManager extends ShardMessenger {
	private readonly options: ShardManagerOptions;
	private readonly instance = crypto.randomUUID();
	private policy: Limits = limits();
	private count = 0;
	private socket?: NativeSocket;
	private connected = false;
	private closed = false;
	private readonly children = new Map<number, Child>();
	private readonly statuses = new Map<number, ShardProcessStatus>();
	private readonly restarts = new Map<number, ReturnType<typeof setTimeout>>();
	private readonly inbound = new Map<string, Inbound>();
	private requests = new Pending(256);
	private loop?: Promise<void>;
	private startPromise?: Promise<void>;
	private closePromise?: Promise<void>;
	private wake?: () => void;
	private finishConnection?: () => void;
	private ownedLogger?: Logger;
	private readonly recovery: { maxRestarts: number; initialDelayMs: number; maxDelayMs: number; stableAfterMs: number };
	private readonly reconnect: { initialDelayMs: number; maxDelayMs: number };
	private readonly startupMs: number;
	private readonly shutdownMs: number;
	private readonly identifyMs: number;
	private get logger() {
		return this.options.logger ?? (this.ownedLogger ??= createConsoleLogger());
	}
	public constructor(options: ShardManagerOptions) {
		super();
		type({
			'restart?': type({
				'maxRestarts?': 'number',
				'initialDelayMs?': 'number',
				'maxDelayMs?': 'number',
				'stableAfterMs?': 'number',
				'+': 'reject'
			}).or('false'),
			'reconnect?': type({ 'initialDelayMs?': 'number', 'maxDelayMs?': 'number', '+': 'reject' }).or('false'),
			'args?': 'string[]',
			'cwd?': 'string'
		}).assert(options);
		identifier.assert(options.id);
		validateToken(options.token);
		const url = new URL(options.url);
		if (!['ws:', 'wss:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/sharding')
			throw new TypeError('Use a ws(s)://host:port/sharding URL without credentials or query.');
		if (url.protocol === 'ws:' && !loopback(url.hostname)) throw new TypeError('Remote hosts require wss://.');
		const script = options.script instanceof URL ? fileURLToPath(options.script) : options.script;
		if (!script.endsWith('.ts')) throw new TypeError('Shard script must be a .ts entrypoint.');
		this.options = {
			...options,
			script: resolve(options.cwd ?? process.cwd(), script),
			args: [...(options.args ?? [])],
			env: { ...options.env }
		};
		this.recovery = { maxRestarts: 5, initialDelayMs: 1000, maxDelayMs: 30000, stableAfterMs: 60000, ...(options.restart || {}) };
		this.reconnect = { initialDelayMs: 500, maxDelayMs: 30000, ...(options.reconnect || {}) };
		if (!Number.isInteger(this.recovery.maxRestarts) || this.recovery.maxRestarts < 0 || this.recovery.maxRestarts > 100)
			throw new TypeError('maxRestarts must be 0..100.');
		for (const value of [
			this.recovery.initialDelayMs,
			this.recovery.maxDelayMs,
			this.recovery.stableAfterMs,
			this.reconnect.initialDelayMs,
			this.reconnect.maxDelayMs
		])
			timeout(value);
		if (
			this.recovery.initialDelayMs < 50 ||
			this.reconnect.initialDelayMs < 50 ||
			this.recovery.maxDelayMs < this.recovery.initialDelayMs ||
			this.reconnect.maxDelayMs < this.reconnect.initialDelayMs
		)
			throw new TypeError('Recovery delays must start at 50ms or more and have a valid maximum.');
		this.startupMs = timeout(options.startupTimeoutMs ?? 30000);
		this.shutdownMs = timeout(options.shutdownTimeoutMs ?? 5000);
		this.identifyMs = timeout(options.identifyTimeoutMs ?? 120000);
	}
	public override get shardCount(): number {
		return this.count;
	}
	public get isConnected(): boolean {
		return this.connected;
	}
	public get processes(): readonly ShardProcessStatus[] {
		return [...this.statuses.values()].sort((a, b) => a.shard - b.shard).map((v) => ({ ...v }));
	}
	/** Resolves after authenticated assignment. Child boot/readiness is visible through processes. */
	public start(): Promise<void> {
		if (this.closed) return Promise.reject(new ShardError('CLOSED', 'Manager is closed.'));
		if (!this.startPromise) {
			this.startPromise = new Promise<void>((resolveStart, rejectStart) => {
				this.loop = this.run(resolveStart, rejectStart);
				void this.loop.catch((error) => {
					this.closed = true;
					rejectStart(error);
					this.report(
						'Host supervisor stopped after a lifecycle failure; inspect cleanup and child-process diagnostics.',
						error,
						'supervisor_stopped'
					);
				});
			});
		}
		return this.startPromise;
	}
	private async run(resolveStart: () => void, rejectStart: (e: unknown) => void): Promise<void> {
		let attempt = 0;
		let first = true;
		while (!this.closed) {
			let welcomed = false;
			const connectedAt = performance.now();
			try {
				await this.connection(() => {
					welcomed = true;
					first = false;
					resolveStart();
				});
			} catch (error) {
				if (first) {
					rejectStart(error);
					this.closed = true;
				}
				if (!this.closed)
					this.report(
						this.options.reconnect === false
							? 'Coordinator connection ended; reconnect is disabled and local shards will stop.'
							: 'Coordinator connection interrupted; local shards will stop before reconnecting.',
						error,
						'connection_lost'
					);
			}
			this.connected = false;
			this.requests.close();
			for (const timer of this.restarts.values()) clearTimeout(timer);
			this.restarts.clear();
			// Never reconnect, release ownership or spawn replacements before every old child exits.
			await Promise.all([...this.children.values()].map((child) => this.stopChild(child)));
			if (this.closed || this.options.reconnect === false) break;
			if (welcomed && performance.now() - connectedAt >= 60000) attempt = 0;
			const delay = Math.min(this.reconnect.maxDelayMs, this.reconnect.initialDelayMs * 2 ** Math.min(attempt++, 20));
			await new Promise<void>((done) => {
				const timer = setTimeout(
					() => {
						this.wake = undefined;
						done();
					},
					delay + Math.floor(Math.random() * delay * 0.2)
				);
				this.wake = () => {
					clearTimeout(timer);
					this.wake = undefined;
					done();
				};
			});
		}
		if (first) rejectStart(new ShardError('CLOSED', 'Manager closed before connecting.'));
	}
	private connection(onWelcome: () => void): Promise<void> {
		return new Promise((resolveConnection, rejectConnection) => {
			const socket = new Socket(this.options.url, {
				perMessageDeflate: false,
				headers: { authorization: `Bearer ${this.options.token}`, 'x-kairo-worker': this.options.id, 'x-kairo-instance': this.instance }
			});
			this.socket = socket;
			let ended = false;
			let welcome = false;
			let lastSeen = performance.now();
			const startup = setTimeout(() => finish(new ShardError('CONNECT_TIMEOUT', 'Coordinator handshake timed out.')), this.startupMs);
			const heartbeat = setInterval(() => {
				if (!welcome) return;
				try {
					if (performance.now() - lastSeen > 15000) throw new ShardError('DISCONNECTED', 'Coordinator heartbeat deadline exceeded.');
					this.send(frame('ping'));
					for (const child of this.children.values()) {
						if (!child.ready || child.intentional) continue;
						if (performance.now() - child.lastSeen > 15000) {
							this.report(
								'Shard missed its heartbeat deadline; stopping the owned process.',
								new ShardError('TIMEOUT', 'Child heartbeat deadline exceeded.'),
								'heartbeat_timeout',
								{ shard: child.shard }
							);
							child.process.kill(9);
						} else this.sendChild(child, frame('ping'));
					}
				} catch (error) {
					finish(error);
				}
			}, 3000);
			const finish = (error?: unknown) => {
				if (ended) return;
				ended = true;
				this.connected = false;
				clearTimeout(startup);
				clearInterval(heartbeat);
				socket.removeEventListener('message', onMessage);
				socket.removeEventListener('close', onClose);
				socket.removeEventListener('error', onError);
				if (this.socket === socket) {
					this.socket = undefined;
					this.finishConnection = undefined;
				}
				socket.terminate();
				if (error) rejectConnection(error);
				else resolveConnection();
			};
			const onClose = () =>
				finish(
					new ShardError(
						'DISCONNECTED',
						welcome ? 'Coordinator disconnected.' : 'Coordinator rejected connection (authentication, ownership, or availability).'
					)
				);
			const onError = () =>
				finish(new ShardError('CONNECT', 'Coordinator connection failed (authentication, ownership, TLS, or availability).'));
			const onMessage = (event: MessageEvent) => {
				try {
					const message = decode(event.data, this.policy.maxBytes, ['welcome', 'pong', 'invoke', 'reply', 'cancel', 'released']);
					lastSeen = performance.now();
					if (!welcome) {
						if (message.op !== 'welcome') throw new ShardError('PROTOCOL', 'Expected coordinator welcome.');
						const d = message.data;
						if (
							d.count > 4096 ||
							!d.shards.length ||
							new Set(d.shards).size !== d.shards.length ||
							d.shards.some((s: number) => s >= d.count)
						)
							throw new ShardError('PROTOCOL', 'Invalid assignments.');
						this.policy = limits(d.limits);
						this.requests = new Pending(this.policy.maxPending);
						this.count = d.count;
						welcome = true;
						clearTimeout(startup);
						this.connected = true;
						for (const shard of d.shards) {
							const previous = this.statuses.get(shard);
							if (previous?.state === 'failed') continue;
							this.spawn(shard, previous?.restarts ?? 0);
						}
						writeEvent(this.logger, 'notif', {
							component: 'sharding.manager',
							event: 'assigned',
							message: 'Host connected to the coordinator; shard assignments received.',
							context: { host: this.options.id, shards: d.shards, count: d.count }
						});
						onWelcome();
						return;
					}
					if (message.op === 'welcome') throw new ShardError('PROTOCOL', 'Repeated welcome.');
					this.receive(message);
				} catch (error) {
					finish(error);
				}
			};
			socket.addEventListener('message', onMessage);
			socket.addEventListener('close', onClose);
			socket.addEventListener('error', onError);
			this.finishConnection = () => finish();
			if (this.closed) finish();
		});
	}
	private spawn(shard: number, restarts: number): void {
		if (!this.connected || this.closed || this.children.has(shard)) return;
		const generation = crypto.randomUUID();
		const status: ShardProcessStatus = { shard, state: 'starting', pid: null, restarts };
		this.statuses.set(shard, status);
		let child: Child | undefined;
		try {
			const subprocess = Bun.spawn([process.execPath, this.options.script as string, ...this.options.args!], {
				cwd: this.options.cwd,
				env: {
					...process.env,
					...this.options.env,
					KAIRO_SHARD: encode(
						{
							shard,
							count: this.count,
							generation,
							limits: this.policy,
							identifyTimeoutMs: this.identifyMs,
							shutdownTimeoutMs: this.shutdownMs
						},
						this.policy.maxBytes
					)
				},
				stdin: 'ignore',
				stdout: 'inherit',
				stderr: 'inherit',
				serialization: 'json',
				windowsHide: true,
				ipc: (input) => {
					if (child && this.children.get(shard) === child) {
						try {
							this.fromChild(child, decode(input, this.policy.maxBytes, ['boot', 'pong', 'call', 'result', 'identify', 'done', 'cancel']));
						} catch (error) {
							this.report('Rejected a child IPC frame; stopping the shard to protect host state.', error, 'ipc_rejected', { shard });
							child.process.kill(9);
						}
					}
				}
			});
			status.pid = subprocess.pid;
			child = {
				shard,
				generation,
				process: subprocess,
				status,
				started: performance.now(),
				lastSeen: performance.now(),
				intentional: false,
				ready: false,
				requests: new Map(),
				startup: setTimeout(() => {
					if (child && !child.ready) {
						this.report(
							'Shard did not complete its boot handshake; stopping the child process.',
							new ShardError('STARTUP_TIMEOUT', 'Child startup timed out.'),
							'startup_timeout',
							{ shard }
						);
						child.process.kill(9);
					}
				}, this.startupMs)
			};
			this.children.set(shard, child);
			const owned = child;
			void subprocess.exited.then(
				(code) => this.exited(owned, code),
				(error) => {
					this.report('Could not confirm the shard process exit; inspect the host and process diagnostics.', error, 'exit_failed', {
						shard
					});
					this.exited(owned, -1);
				}
			);
		} catch (error) {
			status.state = 'failed';
			this.report('Bun could not start the shard process; check the entrypoint and host resources.', error, 'spawn_failed', {
				shard,
				script: this.options.script
			});
			this.recover(shard, restarts);
		}
	}
	private fromChild(child: Child, message: Frame): void {
		child.lastSeen = performance.now();
		if (child.intentional) return;
		if (message.op === 'boot') {
			if (child.ready) throw new ShardError('PROTOCOL', 'Duplicate boot.');
			clearTimeout(child.startup);
			child.ready = true;
			child.status.state = 'running';
			this.send(frame('ready', undefined, { shard: child.shard, generation: child.generation }));
			this.sendChild(child, frame('reply', message.id, { ok: true, value: null }));
			return;
		}
		if (!child.ready) throw new ShardError('PROTOCOL', 'Child must boot before sending requests.');
		if (message.op === 'pong') return;
		if (message.op === 'cancel') {
			child.requests.get(message.id)?.abort();
			return;
		}
		if (message.op === 'done') {
			this.send(frame('done', message.id, { shard: child.shard, generation: child.generation }));
			return;
		}
		if (message.op === 'result') {
			const inbound = this.inbound.get(message.id);
			if (!inbound) return;
			if (inbound.child !== child) throw new ShardError('PROTOCOL', 'Child attempted another shard response.');
			this.inbound.delete(message.id);
			clearTimeout(inbound.timer);
			this.send(frame('result', message.id, { shard: child.shard, generation: child.generation, result: message.data.result }));
			return;
		}
		if (child.requests.has(message.id)) throw new ShardError('PROTOCOL', 'Duplicate child request.');
		if (child.requests.size >= this.policy.maxPending) {
			this.sendChild(child, frame('reply', message.id, failure(new ShardError('CAPACITY', 'Child request capacity reached.'))));
			return;
		}
		const controller = new AbortController();
		child.requests.set(message.id, controller);
		const data =
			message.op === 'call'
				? { ...message.data, source: child.shard }
				: { shard: child.shard, generation: child.generation, timeoutMs: this.identifyMs };
		void this.rpc(frame(message.op, undefined, data), { timeoutMs: data.timeoutMs, signal: controller.signal })
			.then(
				(value) => {
					if (!child.intentional) this.safeChild(child, frame('reply', message.id, { ok: true, value }));
				},
				(error) => {
					if (!child.intentional) this.safeChild(child, frame('reply', message.id, failure(error)));
				}
			)
			.finally(() => child.requests.delete(message.id));
	}
	private receive(message: Frame): void {
		if (message.op === 'pong') return;
		if (message.op === 'released') {
			this.requests.resolve(message.id, null);
			return;
		}
		if (message.op === 'reply') {
			if (message.data.ok) this.requests.resolve(message.id, message.data.value);
			else this.requests.reject(message.id, new ShardError(message.data.error.code, message.data.error.message));
			return;
		}
		if (message.op === 'cancel') {
			const entry = this.inbound.get(message.id);
			if (entry) {
				this.inbound.delete(message.id);
				clearTimeout(entry.timer);
				this.safeChild(entry.child, message);
			}
			return;
		}
		if (message.op === 'invoke') {
			const child = this.children.get(message.data.target);
			if (!child?.ready || child.intentional || child.generation !== message.data.generation) {
				this.send(
					frame('result', message.id, {
						shard: message.data.target,
						generation: message.data.generation,
						result: failure(new ShardError('UNAVAILABLE', 'Destination child is unavailable.'))
					})
				);
				return;
			}
			if (this.inbound.has(message.id)) throw new ShardError('PROTOCOL', 'Duplicate invocation.');
			if (this.inbound.size >= this.policy.maxPending) {
				this.send(
					frame('result', message.id, {
						shard: child.shard,
						generation: child.generation,
						result: failure(new ShardError('CAPACITY', 'Host handler capacity reached.'))
					})
				);
				return;
			}
			timeout(message.data.timeoutMs);
			this.inbound.set(message.id, {
				child,
				timer: setTimeout(() => {
					this.inbound.delete(message.id);
					this.safeChild(child, frame('cancel', message.id));
				}, message.data.timeoutMs)
			});
			this.sendChild(child, message);
		}
	}
	protected override async call(target: number, name: string, payload: unknown, options: ShardCallOptions): Promise<unknown> {
		if (!Number.isInteger(target) || target < 0 || target >= this.count)
			throw new ShardError('TARGET', 'Shard is outside the configured range.');
		identifier.assert(name);
		return this.rpc(
			frame('call', undefined, { source: -1, target, name, payload, timeoutMs: timeout(options.timeoutMs ?? this.policy.timeoutMs) }),
			options
		);
	}
	private async rpc(message: Frame, options: ShardCallOptions): Promise<unknown> {
		if (!this.connected || this.closed) throw new ShardError('DISCONNECTED', 'Manager is not connected.');
		encode(message, this.policy.maxBytes);
		const pending = this.requests.create(message.id, options.timeoutMs ?? this.policy.timeoutMs, options.signal, () => {
			try {
				this.send(frame('cancel', message.id));
			} catch {
				/* Disconnect already rejects pending requests. */
			}
		});
		if (this.requests.has(message.id)) {
			try {
				this.send(message);
			} catch (error) {
				this.requests.reject(message.id, error);
			}
		}
		return pending;
	}
	private send(message: Frame): void {
		if (!this.socket || !this.connected) throw new ShardError('DISCONNECTED', 'Manager is disconnected.');
		try {
			sendSocket(this.socket, message, this.policy);
		} catch (error) {
			this.finishConnection?.();
			throw error;
		}
	}
	private sendChild(child: Child, message: Frame): void {
		child.process.send(encode(message, this.policy.maxBytes));
	}
	private safeChild(child: Child, message: Frame): void {
		try {
			this.sendChild(child, message);
		} catch {
			if (this.children.get(child.shard) === child) child.process.kill(9);
		}
	}
	private exited(child: Child, code: number): void {
		if (this.children.get(child.shard) !== child) return;
		clearTimeout(child.startup);
		this.children.delete(child.shard);
		child.status.pid = null;
		for (const controller of child.requests.values()) controller.abort();
		child.requests.clear();
		for (const [id, entry] of this.inbound)
			if (entry.child === child) {
				clearTimeout(entry.timer);
				this.inbound.delete(id);
			}
		if (this.connected && child.ready) {
			try {
				this.send(frame('offline', undefined, { shard: child.shard, generation: child.generation }));
			} catch {
				/* Connection cleanup owns recovery. */
			}
		}
		child.status.state = 'stopped';
		if (child.intentional || this.closed || !this.connected) return;
		this.report(
			'Shard process ended unexpectedly; applying the configured restart policy.',
			new ShardError('CHILD_EXIT', 'Applying configured restart policy.'),
			'child_exited',
			{
				shard: child.shard,
				exitCode: code,
				restarts: child.status.restarts,
				restartEnabled: this.options.restart !== false,
				maxRestarts: this.recovery.maxRestarts
			}
		);
		const attempts = performance.now() - child.started >= this.recovery.stableAfterMs ? 0 : child.status.restarts;
		this.recover(child.shard, attempts);
	}
	private recover(shard: number, attempts: number): void {
		const status = this.statuses.get(shard)!;
		if (this.closed || !this.connected) return;
		if (this.options.restart === false || attempts >= this.recovery.maxRestarts) {
			status.state = 'failed';
			return;
		}
		status.state = 'backoff';
		status.restarts = attempts + 1;
		const delay = Math.min(this.recovery.maxDelayMs, this.recovery.initialDelayMs * 2 ** Math.min(attempts, 20));
		this.restarts.set(
			shard,
			setTimeout(() => {
				this.restarts.delete(shard);
				this.spawn(shard, attempts + 1);
			}, delay)
		);
	}
	private stopChild(child: Child): Promise<void> {
		child.intentional = true;
		clearTimeout(child.startup);
		return (child.stop ??= (async () => {
			try {
				this.sendChild(child, frame('stop'));
			} catch {
				/* Escalate only this owned process below. */
			}
			if (await this.waitExit(child, this.shutdownMs)) return;
			child.process.kill(9);
			if (!(await this.waitExit(child, this.shutdownMs)))
				throw new ShardError('SHUTDOWN_TIMEOUT', `Could not confirm shard ${child.shard} exited; ownership stays reserved.`);
		})());
	}
	private async waitExit(child: Child, ms: number): Promise<boolean> {
		let timer: ReturnType<typeof setTimeout> | undefined;
		try {
			return await Promise.race([
				child.process.exited.then(() => true),
				new Promise<false>((done) => {
					timer = setTimeout(() => done(false), ms);
				})
			]);
		} finally {
			clearTimeout(timer);
		}
	}
	public close(): Promise<void> {
		return (this.closePromise ??= this.stop());
	}
	private async stop(): Promise<void> {
		// Keep transport alive until child exits are reported and ownership release is acknowledged.
		this.closed = true;
		this.wake?.();
		for (const timer of this.restarts.values()) clearTimeout(timer);
		this.restarts.clear();
		try {
			await Promise.all([...this.children.values()].map((child) => this.stopChild(child)));
			if (this.connected) {
				const message = frame('release');
				const ack = this.requests.create(message.id, this.shutdownMs);
				void ack.catch(() => {});
				try {
					this.send(message);
					await ack;
				} catch (error) {
					this.report(
						'Coordinator did not confirm ownership release; the reservation is retained. Verify old processes are stopped before manual recovery.',
						error,
						'release_unconfirmed'
					);
				}
			}
		} finally {
			this.finishConnection?.();
			this.requests.close();
			for (const entry of this.inbound.values()) clearTimeout(entry.timer);
			this.inbound.clear();
			await this.loop;
			await this.ownedLogger?.close();
		}
	}
	private report(message: string, error: unknown, event: string, context: Record<string, unknown> = {}): void {
		writeEvent(this.logger, 'error', {
			component: 'sharding.manager',
			event,
			message,
			error,
			context: { host: this.options.id, ...context }
		});
	}
}
