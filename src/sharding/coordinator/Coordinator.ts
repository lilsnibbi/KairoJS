// Adapted architecture from discord-sharding, with fixed assignments and named RPC.
// Apache-2.0; see ../LICENSE and ../../../docs/source-retention.md. This is a new incompatible protocol.

import { writeLog } from '../../core/logging/diagnostics';
import type { Logger } from '../../core/logging/index';
import { Logger as DefaultLogger } from '../../core/logging/index';
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
	tokenMatches,
	validateToken
} from '../transport/protocol';
import { type ShardCoordinatorOptions, ShardError, type ShardHost, type ShardSessionLimit } from '../types';
import { CoordinatorState } from './state';

interface Session {
	host: ShardHost;
	instance: string;
	socket?: Bun.ServerWebSocket<Session>;
	lastSeen: number;
	ready: Map<number, string>;
	ids: Set<string>;
	released: boolean;
}
interface Route {
	source: Session;
	sourceShard: number;
	original: string;
	destination: Session;
	shard: number;
	generation: string;
	timer: ReturnType<typeof setTimeout>;
}
interface Identify {
	session: Session;
	message: Frame;
	timer: ReturnType<typeof setTimeout>;
}
const inbound = ['ping', 'ready', 'offline', 'call', 'result', 'cancel', 'identify', 'done', 'release'] as const;

/** Single authenticated control plane. It never spawns a process on another host. */
export class ShardCoordinator {
	private readonly options: ShardCoordinatorOptions;
	private readonly policy: Limits;
	private readonly hosts = new Map<string, ShardHost>();
	private readonly assignments = new Map<number, string>();
	private readonly sessions = new Map<string, Session>();
	private readonly routes = new Map<string, Route>();
	private readonly identifies = new Map<string, Identify>();
	private state?: CoordinatorState;
	private server?: Bun.Server<Session>;
	private heartbeat?: ReturnType<typeof setInterval>;
	private startPromise?: Promise<void>;
	private closePromise?: Promise<void>;
	private closed = false;
	private refreshing = false;
	private refreshAt = 0;
	private readonly lifecycle = new AbortController();
	private refreshPromise?: Promise<void>;
	private ownedLogger?: Logger;
	private get logger() {
		return this.options.logger ?? (this.ownedLogger ??= new DefaultLogger({ name: 'Sharding', level: 'NOTIF' }));
	}

	public constructor(options: ShardCoordinatorOptions) {
		if (!Number.isInteger(options.shardCount) || options.shardCount < 1 || options.shardCount > 4096)
			throw new TypeError('shardCount must be 1..4096.');
		if (!options.statePath || options.statePath === ':memory:')
			throw new TypeError('Provide a dedicated persistent statePath for safe recovery.');
		if (!options.botToken && !options.sessionStartLimit) throw new TypeError('Provide botToken or a fresh sessionStartLimit.');
		if (options.botToken && options.sessionStartLimit) throw new TypeError('Choose botToken or sessionStartLimit.');
		if (!loopback(options.hostname ?? '127.0.0.1') && !options.tls) throw new TypeError('Non-loopback listeners require TLS.');
		if (options.port !== undefined && (!Number.isInteger(options.port) || options.port < 0 || options.port > 65535))
			throw new TypeError('Invalid port.');
		this.policy = limits(options.limits);
		for (const host of options.workers) {
			identifier.assert(host.id);
			validateToken(host.token);
			if (this.hosts.has(host.id) || !host.shards.length) throw new TypeError('Worker IDs must be unique and assignments nonempty.');
			for (const shard of host.shards) {
				if (!Number.isInteger(shard) || shard < 0 || shard >= options.shardCount || this.assignments.has(shard))
					throw new TypeError('Shard assignments must be unique and in range.');
				this.assignments.set(shard, host.id);
			}
			this.hosts.set(host.id, Object.freeze({ ...host, shards: Object.freeze([...host.shards]) }));
			encode(frame('welcome', undefined, { shards: host.shards, count: options.shardCount, limits: this.policy }), this.policy.maxBytes);
		}
		if (this.assignments.size !== options.shardCount) throw new TypeError('Assign every shard exactly once.');
		this.options = { ...options, sessionStartLimit: options.sessionStartLimit && { ...options.sessionStartLimit } };
	}
	public get url(): string | undefined {
		const server = this.server;
		if (!server) return undefined;
		const host = server.hostname ?? '127.0.0.1';
		return `${this.options.tls ? 'wss' : 'ws'}://${host.includes(':') ? `[${host}]` : host}:${server.port}/sharding`;
	}
	public get workers(): readonly { id: string; connected: boolean; shards: readonly number[] }[] {
		return [...this.hosts.values()].map((host) => ({
			id: host.id,
			connected: this.sessions.has(host.id),
			shards: [...(this.sessions.get(host.id)?.ready.keys() ?? [])]
		}));
	}
	public get pendingCount(): number {
		return this.routes.size + this.identifies.size;
	}
	public start(): Promise<void> {
		if (this.closed) return Promise.reject(new ShardError('CLOSED', 'Coordinator is closed.'));
		return (this.startPromise ??= this.open());
	}
	private async open(): Promise<void> {
		try {
			this.state = new CoordinatorState(
				this.options.statePath,
				JSON.stringify([...this.assignments.entries()].sort((a, b) => a[0] - b[0]))
			);
			this.state.update(this.options.sessionStartLimit ?? (await this.fetchLimit()));
			if (this.closed) throw new ShardError('CLOSED', 'Coordinator closed during startup.');
			this.server = Bun.serve<Session>({
				hostname: this.options.hostname ?? '127.0.0.1',
				port: this.options.port ?? 8080,
				tls: this.options.tls,
				development: false,
				fetch: (request, server) => this.upgrade(request, server),
				websocket: {
					maxPayloadLength: this.policy.maxBytes,
					backpressureLimit: this.policy.maxBufferedBytes,
					closeOnBackpressureLimit: true,
					perMessageDeflate: false,
					idleTimeout: 30,
					sendPings: true,
					open: (socket) => {
						socket.data.socket = socket;
						this.safeSend(
							socket.data,
							frame('welcome', undefined, { shards: socket.data.host.shards, count: this.options.shardCount, limits: this.policy })
						);
					},
					message: (socket, input) => {
						try {
							this.receive(socket.data, decode(input, this.policy.maxBytes, inbound));
						} catch (error) {
							this.report('Rejected sharding protocol message.', error);
							this.disconnect(socket.data);
							socket.close(1008, 'Invalid protocol');
						}
					},
					close: (socket) => this.disconnect(socket.data)
				}
			});
			this.heartbeat = setInterval(() => {
				for (const session of this.sessions.values())
					if (performance.now() - session.lastSeen > 15000) {
						this.disconnect(session);
						session.socket?.terminate();
					}
				this.grantIdentifies();
				if (this.state?.expired && this.options.botToken && !this.refreshing && Date.now() >= this.refreshAt)
					this.refreshPromise = this.refresh();
			}, 250);
		} catch (error) {
			this.state?.close();
			this.state = undefined;
			throw error;
		}
	}
	private upgrade(request: Request, server: Bun.Server<Session>): Response | undefined {
		if (this.closed || new URL(request.url).pathname !== '/sharding') return new Response('Not found', { status: 404 });
		const host = this.hosts.get(request.headers.get('x-kairo-worker') ?? '');
		if (!host || !tokenMatches(request.headers.get('authorization'), host.token)) return new Response('Unauthorized', { status: 401 });
		if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket' || request.headers.has('origin'))
			return new Response('Native WebSocket upgrade required', { status: 400 });
		const instance = request.headers.get('x-kairo-instance');
		if (!identifier.allows(instance)) return new Response('Invalid identity', { status: 400 });
		if (this.sessions.has(host.id)) return new Response('Worker already connected', { status: 409 });
		try {
			this.state!.claim(host.id, instance);
		} catch {
			return new Response('Worker ownership is reserved', { status: 409 });
		}
		const session: Session = { host, instance, lastSeen: performance.now(), ready: new Map(), ids: new Set(), released: false };
		this.sessions.set(host.id, session);
		// Supervisors only register/reconnect after the previous children have exited.
		this.state!.stopped(host.id);
		if (server.upgrade(request, { data: session })) return undefined;
		this.sessions.delete(host.id);
		return new Response('Upgrade required', { status: 400 });
	}
	private receive(session: Session, message: Frame): void {
		if (this.sessions.get(session.host.id) !== session || session.released) throw new ShardError('OWNERSHIP', 'Stale worker connection.');
		session.lastSeen = performance.now();
		const d = message.data;
		switch (message.op) {
			case 'ping':
				this.send(session, frame('pong', message.id));
				return;
			case 'ready':
				this.assigned(session, d.shard);
				if (session.ready.has(d.shard)) throw new ShardError('OWNERSHIP', 'Shard already registered.');
				session.ready.set(d.shard, d.generation);
				return;
			case 'offline':
				this.identity(session, d);
				this.removeShard(session, d.shard, d.generation);
				return;
			case 'done':
				this.identity(session, d);
				this.state!.stopped(session.host.id, d.shard, d.generation);
				this.grantIdentifies();
				return;
			case 'identify': {
				this.identity(session, d);
				timeout(d.timeoutMs);
				if ([...this.identifies.values()].some((p) => p.session === session && p.message.data.shard === d.shard))
					throw new ShardError('PROTOCOL', 'Shard already has a queued identify.');
				if (!this.reserve(session, message.id)) return;
				// Another attempt by this shard means its previous identify did not produce READY.
				this.state!.stopped(session.host.id, d.shard, d.generation);
				const id = crypto.randomUUID();
				this.identifies.set(id, {
					session,
					message,
					timer: setTimeout(() => {
						this.finishIdentify(
							id,
							new ShardError('IDENTIFY_TIMEOUT', 'No identify slot before deadline; session allowance may be exhausted or expired.')
						);
					}, d.timeoutMs)
				});
				this.grantIdentifies();
				return;
			}
			case 'call':
				this.route(session, message);
				return;
			case 'result': {
				const route = this.routes.get(message.id);
				if (!route) return;
				if (route.destination !== session || route.shard !== d.shard || route.generation !== d.generation)
					throw new ShardError('PROTOCOL', 'Reply identity mismatch.');
				this.complete(message.id, d.result);
				return;
			}
			case 'cancel':
				for (const [id, route] of this.routes)
					if (route.source === session && route.original === message.id)
						this.complete(id, failure(new ShardError('ABORTED', 'Caller cancelled.')));
				for (const [id, pending] of this.identifies)
					if (pending.session === session && pending.message.id === message.id)
						this.finishIdentify(id, new ShardError('ABORTED', 'Caller cancelled.'));
				return;
			case 'release':
				if (session.ready.size) throw new ShardError('OWNERSHIP', 'Stop all owned shards before releasing a worker.');
				this.state!.release(session.host.id);
				session.released = true;
				this.send(session, frame('released', message.id));
				return;
		}
	}
	private route(session: Session, message: Frame): void {
		const d = message.data;
		if (d.source !== -1) {
			this.assigned(session, d.source);
			if (!session.ready.has(d.source)) throw new ShardError('OWNERSHIP', 'Source shard is offline.');
		}
		timeout(d.timeoutMs);
		if (!this.reserve(session, message.id)) return;
		const destination = this.sessions.get(this.assignments.get(d.target) ?? '');
		const generation = destination?.ready.get(d.target);
		if (!destination || !generation) {
			session.ids.delete(message.id);
			this.send(session, frame('reply', message.id, failure(new ShardError('UNAVAILABLE', `Shard ${d.target} is unavailable.`))));
			return;
		}
		const id = crypto.randomUUID();
		this.routes.set(id, {
			source: session,
			sourceShard: d.source,
			original: message.id,
			destination,
			shard: d.target,
			generation,
			timer: setTimeout(() => this.complete(id, failure(new ShardError('TIMEOUT', 'Destination shard timed out.'))), d.timeoutMs)
		});
		try {
			this.send(destination, frame('invoke', id, { ...d, generation }));
		} catch (error) {
			this.complete(id, failure(error));
		}
	}
	private reserve(session: Session, id: string): boolean {
		if (session.ids.has(id)) throw new ShardError('PROTOCOL', 'Duplicate operation ID.');
		if (this.pendingCount >= this.policy.maxPending || session.ids.size >= this.policy.maxPending) {
			this.send(session, frame('reply', id, failure(new ShardError('CAPACITY', 'Coordinator request capacity reached.'))));
			return false;
		}
		session.ids.add(id);
		return true;
	}
	private complete(id: string, result: unknown): void {
		const route = this.routes.get(id);
		if (!route) return;
		this.routes.delete(id);
		clearTimeout(route.timer);
		route.source.ids.delete(route.original);
		this.safeSend(route.destination, frame('cancel', id));
		this.safeSend(route.source, frame('reply', route.original, result));
	}
	private grantIdentifies(): void {
		if (!this.state || this.closed) return;
		for (const [id, pending] of this.identifies) {
			const d = pending.message.data;
			try {
				if (this.state.grant(pending.session.host.id, d.shard, d.generation)) this.finishIdentify(id);
			} catch (error) {
				this.finishIdentify(id, error);
				this.report('Could not persist identify grant.', error);
				void this.close();
				return;
			}
		}
	}
	private finishIdentify(id: string, error?: unknown): void {
		const pending = this.identifies.get(id);
		if (!pending) return;
		this.identifies.delete(id);
		clearTimeout(pending.timer);
		pending.session.ids.delete(pending.message.id);
		this.safeSend(pending.session, frame('reply', pending.message.id, error ? failure(error) : { ok: true, value: null }));
	}
	private assigned(session: Session, shard: number): void {
		if (this.assignments.get(shard) !== session.host.id) throw new ShardError('OWNERSHIP', 'Shard belongs to another host.');
	}
	private identity(session: Session, data: { shard: number; generation: string }): void {
		this.assigned(session, data.shard);
		if (session.ready.get(data.shard) !== data.generation) throw new ShardError('OWNERSHIP', 'Stale shard generation.');
	}
	private removeShard(session: Session, shard: number, generation: string): void {
		session.ready.delete(shard);
		this.state!.stopped(session.host.id, shard, generation);
		for (const [id, route] of this.routes)
			if ((route.destination === session && route.shard === shard) || (route.source === session && route.sourceShard === shard))
				this.complete(id, failure(new ShardError('UNAVAILABLE', 'Shard exited.')));
		for (const [id, pending] of this.identifies)
			if (pending.session === session && pending.message.data.shard === shard)
				this.finishIdentify(id, new ShardError('UNAVAILABLE', 'Shard exited.'));
	}
	private disconnect(session: Session): void {
		if (this.sessions.get(session.host.id) !== session) return;
		this.sessions.delete(session.host.id);
		for (const [id, route] of this.routes)
			if (route.source === session || route.destination === session)
				this.complete(id, failure(new ShardError('DISCONNECTED', 'Worker disconnected.')));
		for (const [id, pending] of this.identifies)
			if (pending.session === session) this.finishIdentify(id, new ShardError('DISCONNECTED', 'Worker disconnected.'));
		// No release here: a network partition cannot prove remote processes exited.
	}
	private send(session: Session, message: Frame): void {
		if (!session.socket) throw new ShardError('DISCONNECTED', 'Worker socket unavailable.');
		sendSocket(session.socket, message, this.policy);
	}
	private safeSend(session: Session, message: Frame): void {
		if (this.sessions.get(session.host.id) !== session) return;
		try {
			this.send(session, message);
		} catch {
			this.disconnect(session);
			session.socket?.terminate();
		}
	}
	/** Only call after independently confirming all processes on this disconnected host are dead. */
	public releaseWorker(id: string): void {
		if (!this.state || this.closed || !this.hosts.has(id)) throw new ShardError('STATE', 'Unknown worker or closed coordinator.');
		if (this.sessions.has(id)) throw new ShardError('OWNERSHIP', 'Cannot release a connected worker.');
		this.state.release(id);
	}
	/** Refresh an offline/manual snapshot; never increases an unexpired allowance. */
	public updateSessionLimit(value: ShardSessionLimit): void {
		if (!this.state || this.closed) throw new ShardError('STATE', 'Coordinator is not running.');
		this.state.update(value);
		this.grantIdentifies();
	}
	private async fetchLimit(): Promise<ShardSessionLimit> {
		const response = await fetch('https://discord.com/api/v10/gateway/bot', {
			headers: { authorization: `Bot ${this.options.botToken}` },
			signal: AbortSignal.any([this.lifecycle.signal, AbortSignal.timeout(15000)])
		});
		if (!response.ok) throw new ShardError('GATEWAY', `Gateway metadata request failed (${response.status}).`);
		const result = (await response.json()) as { session_start_limit: ShardSessionLimit };
		return result.session_start_limit;
	}
	private async refresh(): Promise<void> {
		this.refreshing = true;
		try {
			const value = await this.fetchLimit();
			if (!this.closed) this.updateSessionLimit(value);
		} catch (error) {
			this.refreshAt = Date.now() + 30000;
			if (!this.closed) this.report('Gateway metadata refresh failed; identifies remain blocked.', error);
		} finally {
			this.refreshing = false;
		}
	}
	public close(): Promise<void> {
		this.closed = true;
		this.lifecycle.abort();
		return (this.closePromise ??= this.stop());
	}
	private async stop(): Promise<void> {
		await this.startPromise?.catch(() => {});
		clearInterval(this.heartbeat);
		for (const session of this.sessions.values()) {
			this.disconnect(session);
			session.socket?.terminate();
		}
		await this.server?.stop(true);
		this.server = undefined;
		await this.refreshPromise;
		this.state?.close();
		this.state = undefined;
		await this.ownedLogger?.close();
	}
	private report(message: string, error: unknown): void {
		writeLog(this.logger, 'error', message, error);
	}
}
