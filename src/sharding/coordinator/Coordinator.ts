// Adapted architecture from discord-sharding, with fixed assignments and named RPC.
// Apache-2.0; see ../LICENSE and ../../../docs/source-retention.md. This is a new incompatible protocol.

import type { Logger } from '@lilsnibbi/logger';
import { createConsoleLogger } from '../../core/logging/console';
import { writeEvent } from '../../core/logging/diagnostics';
import type { LoggerLike } from '../../core/logging/LoggerLike';
import { safeContext } from '../../core/logging/redact';
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
	connectionId: string;
	connectedAt: number;
	resumedOwnership: boolean;
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
	name: string;
	startedAt: number;
	timeoutMs: number;
	timer: ReturnType<typeof setTimeout>;
}
interface Identify {
	session: Session;
	message: Frame;
	startedAt: number;
	timer: ReturnType<typeof setTimeout>;
}
type DisconnectReason = 'peer_closed' | 'protocol_rejected' | 'heartbeat_timeout' | 'send_failed' | 'server_shutdown';
type Outcome = ReturnType<typeof failure> | { ok: true; value: unknown };
const inbound = ['ping', 'ready', 'offline', 'call', 'result', 'cancel', 'identify', 'done', 'release'] as const;

/** Single authenticated control plane. It never spawns a process on another host. */
export class ShardCoordinator {
	private readonly options: ShardCoordinatorOptions;
	private readonly policy: Limits;
	private readonly hosts = new Map<string, ShardHost>();
	private readonly assignments = new Map<number, string>();
	private readonly logSecrets: readonly string[];
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
		return this.options.logger ?? (this.ownedLogger ??= createConsoleLogger());
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
		this.logSecrets = [...this.hosts.values()].map((host) => host.token);
		if (options.botToken) this.logSecrets = [...this.logSecrets, options.botToken];
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
			this.activity('debug', 'starting', 'Opening coordinator state and preparing its WebSocket listener.');
			this.state = new CoordinatorState(
				this.options.statePath,
				JSON.stringify([...this.assignments.entries()].sort((a, b) => a[0] - b[0]))
			);
			const sessionLimit = this.options.sessionStartLimit ?? (await this.fetchLimit());
			this.state.update(sessionLimit);
			this.logIdentifyLimits(sessionLimit);
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
						this.activity('notif', 'host_connected', 'Authenticated host connected; sending its shard assignments.', {
							...this.connectionContext(socket.data),
							shards: socket.data.host.shards,
							assignedCount: socket.data.host.shards.length,
							resumedOwnership: socket.data.resumedOwnership
						});
						this.safeSend(
							socket.data,
							frame('welcome', undefined, { shards: socket.data.host.shards, count: this.options.shardCount, limits: this.policy })
						);
					},
					message: (socket, input) => {
						let message: Frame | undefined;
						try {
							message = decode(input, this.policy.maxBytes, inbound);
							this.receive(socket.data, message);
						} catch (error) {
							this.report(
								'Host sent an invalid control-plane frame; disconnecting it to protect coordinator state.',
								error,
								'protocol_rejected',
								{ ...this.connectionContext(socket.data), operation: message?.op, requestId: message?.id }
							);
							this.disconnect(socket.data, 'protocol_rejected', 1008);
							socket.close(1008, 'Invalid protocol');
						}
					},
					close: (socket, code) => this.disconnect(socket.data, 'peer_closed', code)
				}
			});
			this.heartbeat = setInterval(() => {
				for (const session of this.sessions.values())
					if (performance.now() - session.lastSeen > 15000) {
						this.disconnect(session, 'heartbeat_timeout');
						session.socket?.terminate();
					}
				this.grantIdentifies();
				if (this.state?.expired && this.options.botToken && !this.refreshing && Date.now() >= this.refreshAt)
					this.refreshPromise = this.refresh();
			}, 250);
			this.activity('notif', 'listening', 'Coordinator is accepting authenticated host connections.', {
				address: this.server.hostname,
				port: this.server.port,
				tls: !!this.options.tls,
				hosts: this.hosts.size,
				shards: this.options.shardCount
			});
		} catch (error) {
			this.report('Coordinator could not start; inspect listener configuration and persistent state.', error, 'startup_failed');
			this.state?.close();
			this.state = undefined;
			throw error;
		}
	}
	private upgrade(request: Request, server: Bun.Server<Session>): Response | undefined {
		if (this.closed || new URL(request.url).pathname !== '/sharding') return new Response('Not found', { status: 404 });
		const connectionId = crypto.randomUUID();
		const host = this.hosts.get(request.headers.get('x-kairo-worker') ?? '');
		if (!host || !tokenMatches(request.headers.get('authorization'), host.token)) {
			this.activity('alert', 'authentication_rejected', 'Host authentication failed; check the configured host ID and shared secret.', {
				connectionId,
				host: host?.id,
				status: 401,
				reason: host ? 'invalid_credentials' : 'unknown_host'
			});
			return new Response('Unauthorized', { status: 401 });
		}
		const reject = (status: number, reason: string, text: string) => {
			this.activity(
				'alert',
				'upgrade_rejected',
				'Authenticated host could not open a WebSocket connection; inspect the rejection reason.',
				{
					host: host.id,
					connectionId,
					status,
					reason
				}
			);
			return new Response(text, { status });
		};
		if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket' || request.headers.has('origin'))
			return reject(400, 'native_upgrade_required', 'Native WebSocket upgrade required');
		const instance = request.headers.get('x-kairo-instance');
		if (!identifier.allows(instance)) return reject(400, 'invalid_identity', 'Invalid identity');
		if (this.sessions.has(host.id)) return reject(409, 'host_already_connected', 'Worker already connected');
		let claimed: boolean;
		try {
			claimed = this.state!.claim(host.id, instance);
		} catch {
			return reject(409, 'ownership_reserved', 'Worker ownership is reserved');
		}
		const session: Session = {
			host,
			instance,
			connectionId,
			connectedAt: performance.now(),
			resumedOwnership: !claimed,
			lastSeen: performance.now(),
			ready: new Map(),
			ids: new Set(),
			released: false
		};
		this.sessions.set(host.id, session);
		let upgraded = false;
		try {
			upgraded = server.upgrade(request, { data: session });
			if (upgraded) {
				// Only a completed registration proves the previous children have exited.
				this.state!.stopped(host.id);
				return undefined;
			}
		} finally {
			if (!upgraded) {
				this.sessions.delete(host.id);
				if (claimed) this.state!.release(host.id);
				this.activity('debug', 'upgrade_rolled_back', 'WebSocket upgrade did not complete; temporary connection state was removed.', {
					host: host.id,
					connectionId,
					ownershipReleased: claimed
				});
			}
		}
		return reject(400, 'upgrade_not_accepted', 'Upgrade required');
	}
	private receive(session: Session, message: Frame): void {
		if (this.sessions.get(session.host.id) !== session || session.released) throw new ShardError('OWNERSHIP', 'Stale worker connection.');
		session.lastSeen = performance.now();
		this.activity('debug', 'frame_received', 'Received a validated host frame.', {
			...this.connectionContext(session),
			operation: message.op,
			requestId: message.id
		});
		const d = message.data;
		switch (message.op) {
			case 'ping':
				this.send(session, frame('pong', message.id));
				return;
			case 'ready':
				this.assigned(session, d.shard);
				if (session.ready.has(d.shard)) throw new ShardError('OWNERSHIP', 'Shard already registered.');
				session.ready.set(d.shard, d.generation);
				this.activity('notif', 'shard_registered', 'Host registered a shard; requests can now be routed to it.', {
					...this.connectionContext(session),
					shard: d.shard,
					generation: d.generation,
					readyShards: session.ready.size,
					assignedCount: session.host.shards.length
				});
				return;
			case 'offline':
				this.identity(session, d);
				this.removeShard(session, d.shard, d.generation);
				return;
			case 'done':
				this.identity(session, d);
				this.state!.stopped(session.host.id, d.shard, d.generation);
				this.activity('notif', 'identify_completed', 'Shard confirmed its gateway login; its identify slot can finish cooling down.', {
					...this.connectionContext(session),
					shard: d.shard,
					generation: d.generation
				});
				this.grantIdentifies();
				return;
			case 'identify': {
				this.identity(session, d);
				timeout(d.timeoutMs);
				if ([...this.identifies.values()].some((p) => p.session === session && p.message.data.shard === d.shard))
					throw new ShardError('PROTOCOL', 'Shard already has a queued identify.');
				if (!this.reserve(session, message)) return;
				// Another attempt by this shard means its previous identify did not produce READY.
				this.state!.stopped(session.host.id, d.shard, d.generation);
				const id = crypto.randomUUID();
				this.identifies.set(id, {
					session,
					message,
					startedAt: performance.now(),
					timer: setTimeout(() => {
						this.finishIdentify(
							id,
							new ShardError('IDENTIFY_TIMEOUT', 'No identify slot before deadline; session allowance may be exhausted or expired.')
						);
					}, d.timeoutMs)
				});
				this.activity('notif', 'identify_queued', 'Shard requested a gateway login permit; waiting for an available identify slot.', {
					...this.connectionContext(session),
					requestId: message.id,
					shard: d.shard,
					generation: d.generation,
					timeoutMs: d.timeoutMs,
					pendingIdentifies: this.identifies.size,
					remaining: this.state!.remaining,
					expired: this.state!.expired
				});
				this.grantIdentifies();
				return;
			}
			case 'call':
				this.route(session, message);
				return;
			case 'result': {
				const route = this.routes.get(message.id);
				if (!route) {
					this.activity('debug', 'late_result_ignored', 'Ignored a result for a request that has already ended.', {
						...this.connectionContext(session),
						routeId: message.id,
						shard: d.shard
					});
					return;
				}
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
				this.activity('notif', 'ownership_released', 'Host stopped its shards and released its ownership reservation.', {
					...this.connectionContext(session),
					requestId: message.id
				});
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
		if (!this.reserve(session, message)) return;
		const destination = this.sessions.get(this.assignments.get(d.target) ?? '');
		const generation = destination?.ready.get(d.target);
		if (!destination || !generation) {
			session.ids.delete(message.id);
			this.activity('alert', 'request_rejected', 'Shard request was not dispatched; the destination shard is unavailable.', {
				...this.connectionContext(session),
				requestId: message.id,
				shard: d.target,
				operation: d.name,
				code: 'UNAVAILABLE'
			});
			this.send(session, frame('reply', message.id, failure(new ShardError('UNAVAILABLE', `Shard ${d.target} is unavailable.`))));
			return;
		}
		const id = crypto.randomUUID();
		const route: Route = {
			source: session,
			sourceShard: d.source,
			original: message.id,
			destination,
			shard: d.target,
			generation,
			name: d.name,
			startedAt: performance.now(),
			timeoutMs: d.timeoutMs,
			timer: setTimeout(() => this.complete(id, failure(new ShardError('TIMEOUT', 'Destination shard timed out.'))), d.timeoutMs)
		};
		this.routes.set(id, route);
		try {
			this.send(destination, frame('invoke', id, { ...d, generation }));
			this.activity('notif', 'request_dispatched', 'Dispatched a shard request to its destination host.', this.routeContext(id, route));
		} catch (error) {
			this.complete(id, failure(error));
		}
	}
	private reserve(session: Session, message: Frame): boolean {
		const id = message.id;
		if (session.ids.has(id)) throw new ShardError('PROTOCOL', 'Duplicate operation ID.');
		if (this.pendingCount >= this.policy.maxPending || session.ids.size >= this.policy.maxPending) {
			this.activity('alert', 'request_rejected', 'Coordinator cannot accept more pending work; inspect request volume and deadlines.', {
				...this.connectionContext(session),
				requestId: id,
				operation: message.op === 'call' ? message.data.name : 'identify',
				shard: message.op === 'call' ? message.data.target : message.data.shard,
				code: 'CAPACITY',
				pending: this.pendingCount,
				maxPending: this.policy.maxPending
			});
			this.send(session, frame('reply', id, failure(new ShardError('CAPACITY', 'Coordinator request capacity reached.'))));
			return false;
		}
		session.ids.add(id);
		return true;
	}
	private complete(id: string, result: Outcome): void {
		const route = this.routes.get(id);
		if (!route) return;
		this.routes.delete(id);
		clearTimeout(route.timer);
		route.source.ids.delete(route.original);
		const code = result.ok ? undefined : result.error.code;
		this.activity(
			result.ok || code === 'ABORTED' ? 'notif' : 'alert',
			result.ok
				? 'request_completed'
				: code === 'TIMEOUT'
					? 'request_timed_out'
					: code === 'ABORTED'
						? 'request_cancelled'
						: 'request_failed',
			result.ok
				? 'Shard request completed.'
				: code === 'TIMEOUT'
					? 'Shard request exceeded its deadline; requesting remote cancellation.'
					: code === 'ABORTED'
						? 'Caller cancelled the shard request; requesting remote cancellation.'
						: code === 'DISCONNECTED'
							? 'Shard request stopped because a host connection ended.'
							: code === 'UNAVAILABLE'
								? 'Shard request could not complete because its shard went offline.'
								: 'Shard request failed; inspect the destination handler and diagnostic code.',
			{ ...this.routeContext(id, route), code }
		);
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
				this.report(
					'Could not save a shard login reservation; stopping the coordinator to prevent unsafe login retries.',
					error,
					'identify_persistence_failed',
					{
						host: pending.session.host.id,
						shard: d.shard,
						requestId: pending.message.id
					}
				);
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
		const code = error instanceof ShardError ? error.code : error ? 'STATE' : undefined;
		this.activity(
			error && code !== 'ABORTED' ? 'alert' : 'notif',
			!error
				? 'identify_granted'
				: code === 'IDENTIFY_TIMEOUT'
					? 'identify_timed_out'
					: code === 'ABORTED'
						? 'identify_cancelled'
						: 'identify_failed',
			!error
				? 'Granted a gateway login permit to the shard.'
				: code === 'IDENTIFY_TIMEOUT'
					? 'Gateway login permit missed its deadline; inspect identify allowance and active slots.'
					: code === 'ABORTED'
						? 'Caller cancelled the queued gateway login permit.'
						: 'Queued gateway login permit could not complete; inspect the host connection and coordinator state.',
			{
				...this.connectionContext(pending.session),
				requestId: pending.message.id,
				shard: pending.message.data.shard,
				generation: pending.message.data.generation,
				durationMs: Math.round(performance.now() - pending.startedAt),
				remaining: this.state?.remaining,
				code
			}
		);
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
		this.activity('notif', 'shard_offline', 'Host marked a shard offline; pending work involving it will fail.', {
			...this.connectionContext(session),
			shard,
			generation,
			readyShards: session.ready.size
		});
		for (const [id, route] of this.routes)
			if ((route.destination === session && route.shard === shard) || (route.source === session && route.sourceShard === shard))
				this.complete(id, failure(new ShardError('UNAVAILABLE', 'Shard exited.')));
		for (const [id, pending] of this.identifies)
			if (pending.session === session && pending.message.data.shard === shard)
				this.finishIdentify(id, new ShardError('UNAVAILABLE', 'Shard exited.'));
	}
	private disconnect(session: Session, reason: DisconnectReason, closeCode?: number): void {
		if (this.sessions.get(session.host.id) !== session) return;
		this.sessions.delete(session.host.id);
		this.activity(
			session.released || reason === 'server_shutdown' || (reason === 'peer_closed' && closeCode === 1000) ? 'notif' : 'alert',
			'host_disconnected',
			session.released
				? 'Host disconnected after releasing ownership.'
				: 'Host disconnected; pending work will fail and ownership remains reserved until its old processes are confirmed stopped.',
			{
				...this.connectionContext(session),
				reason,
				closeCode,
				shards: [...session.ready.keys()],
				readyShards: session.ready.size,
				pending: session.ids.size,
				ownershipRetained: !session.released,
				durationMs: Math.round(performance.now() - session.connectedAt)
			}
		);
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
		this.activity('debug', 'frame_sent', 'Sent a coordinator frame to the host.', {
			...this.connectionContext(session),
			operation: message.op,
			requestId: message.id
		});
	}
	private safeSend(session: Session, message: Frame): void {
		if (this.sessions.get(session.host.id) !== session) return;
		try {
			this.send(session, message);
		} catch (error) {
			this.activity('alert', 'send_failed', 'Coordinator could not send a frame; disconnecting the host and failing its pending work.', {
				...this.connectionContext(session),
				operation: message.op,
				requestId: message.id,
				code: error instanceof ShardError ? error.code : 'SEND'
			});
			this.disconnect(session, 'send_failed');
			session.socket?.terminate();
		}
	}
	/** Only call after independently confirming all processes on this disconnected host are dead. */
	public releaseWorker(id: string): void {
		if (!this.state || this.closed || !this.hosts.has(id)) throw new ShardError('STATE', 'Unknown worker or closed coordinator.');
		if (this.sessions.has(id)) throw new ShardError('OWNERSHIP', 'Cannot release a connected worker.');
		this.state.release(id);
		this.activity('notif', 'ownership_released', 'Operator released a disconnected host ownership reservation.', {
			host: id,
			operator: true
		});
	}
	/** Refresh an offline/manual snapshot; never increases an unexpired allowance. */
	public updateSessionLimit(value: ShardSessionLimit): void {
		if (!this.state || this.closed) throw new ShardError('STATE', 'Coordinator is not running.');
		this.state.update(value);
		this.logIdentifyLimits(value);
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
			this.activity('debug', 'identify_limits_refreshing', 'Refreshing Discord gateway login limits.');
			const value = await this.fetchLimit();
			if (!this.closed) this.updateSessionLimit(value);
		} catch (error) {
			this.refreshAt = Date.now() + 30000;
			if (!this.closed)
				this.report('Could not refresh Discord session limits; new shard logins remain blocked.', error, 'gateway_metadata_refresh_failed');
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
		const wasListening = this.server !== undefined;
		if (wasListening)
			this.activity('notif', 'stopping', 'Coordinator is stopping; disconnecting hosts and failing pending work.', {
				hosts: this.sessions.size,
				pending: this.pendingCount
			});
		clearInterval(this.heartbeat);
		for (const session of this.sessions.values()) {
			this.disconnect(session, 'server_shutdown');
			session.socket?.terminate();
		}
		await this.server?.stop(true);
		this.server = undefined;
		await this.refreshPromise;
		this.state?.close();
		this.state = undefined;
		if (wasListening) this.activity('notif', 'stopped', 'Coordinator listener and persistent state are closed.');
		await this.ownedLogger?.close();
	}
	private connectionContext(session: Session) {
		return { host: session.host.id, connectionId: session.connectionId };
	}
	private routeContext(id: string, route: Route) {
		return {
			...this.connectionContext(route.source),
			requestId: route.original,
			routeId: id,
			destinationHost: route.destination.host.id,
			destinationConnectionId: route.destination.connectionId,
			sourceShard: route.sourceShard === -1 ? null : route.sourceShard,
			shard: route.shard,
			generation: route.generation,
			operation: route.name,
			timeoutMs: route.timeoutMs,
			durationMs: Math.round(performance.now() - route.startedAt)
		};
	}
	private logIdentifyLimits(value: ShardSessionLimit): void {
		const remaining = this.state!.remaining;
		const expired = this.state!.expired;
		this.activity(
			remaining && !expired ? 'notif' : 'alert',
			'identify_limits_updated',
			remaining && !expired
				? 'Coordinator gateway login allowance is ready.'
				: 'Gateway login allowance is exhausted or expired; new login permits must wait for fresh limits.',
			{ remaining, expired, total: value.total, maxConcurrency: value.max_concurrency }
		);
	}
	private activity(level: keyof LoggerLike, event: string, message: string, context?: Record<string, unknown>, error?: unknown): void {
		writeEvent(this.logger, level, {
			component: 'sharding.coordinator',
			event,
			message,
			// Selected metadata only; also scrub configured credentials for caller-supplied loggers.
			context: safeContext(context, this.logSecrets),
			error
		});
	}
	private report(message: string, error: unknown, event: string, context?: Record<string, unknown>): void {
		this.activity('error', event, message, context, error);
	}
}
