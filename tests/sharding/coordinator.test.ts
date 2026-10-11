import { describe, expect, test } from 'bun:test';
import { ShardCoordinator, ShardManager } from '../../src/index';
import { encode, type Frame, frame, type Op } from '../../src/sharding/transport/protocol';
import { Socket } from '../../src/sharding/transport/socket';
import { fixture, logger, stack, tokenA, tokenB, until } from './helpers';

async function peer(url: string, id: 'a' | 'b', instance: string = crypto.randomUUID()) {
	const socket = new Socket(url, {
		headers: { authorization: `Bearer ${id === 'a' ? tokenA : tokenB}`, 'x-kairo-worker': id, 'x-kairo-instance': instance },
		perMessageDeflate: false
	});
	const messages: Frame[] = [];
	let closed = false;
	socket.addEventListener('message', (event) => messages.push(JSON.parse(event.data)));
	socket.addEventListener('close', () => {
		closed = true;
	});
	const next = async (op: Op, id?: string, ms = 3000) => {
		await until(() => messages.some((m) => m.op === op && (!id || m.id === id)), ms);
		const index = messages.findIndex((m) => m.op === op && (!id || m.id === id));
		return messages.splice(index, 1)[0];
	};
	await next('welcome');
	return {
		socket,
		next,
		instance,
		get closed() {
			return closed;
		},
		send(op: Op, data: any = {}, id: string = crypto.randomUUID()) {
			socket.send(encode(frame(op, id, data), 65536));
			return id;
		},
		async close() {
			socket.terminate();
			await until(() => closed);
		}
	};
}
describe('authenticated coordinator on real WebSockets', () => {
	test('rejects HTTP auth and non-upgrades without claiming ownership', async () => {
		const s = await stack();
		try {
			const url = s.coordinator.url!.replace('ws:', 'http:');
			expect((await fetch(url)).status).toBe(401);
			expect(
				(await fetch(url, { headers: { authorization: `Bearer ${tokenA}`, 'x-kairo-worker': 'a', 'x-kairo-instance': 'http-only' } }))
					.status
			).toBe(400);
			const a = await s.host('a');
			expect(a.isConnected).toBe(true);
		} finally {
			await s.close();
		}
	});
	test('pins disconnected host ownership until the operator explicitly releases it', async () => {
		const s = await stack();
		try {
			const a = await peer(s.coordinator.url!, 'a');
			const instance = a.instance;
			await a.close();
			const duplicate = new ShardManager({ id: 'a', url: s.coordinator.url!, token: tokenA, script: fixture, logger });
			await expect(duplicate.start()).rejects.toThrow();
			await duplicate.close();
			const reconnect = await peer(s.coordinator.url!, 'a', instance);
			await reconnect.close();
			s.coordinator.releaseWorker('a');
			const replacement = await s.host('a');
			expect(replacement.isConnected).toBe(true);
		} finally {
			await s.close();
		}
	});
	test('rejects duplicate shard registration and a host claiming another host shard', async () => {
		const s = await stack();
		try {
			const a = await peer(s.coordinator.url!, 'a');
			a.send('ready', { shard: 0, generation: 'first' });
			a.send('ready', { shard: 0, generation: 'second' });
			await until(() => a.closed);
			const b = await peer(s.coordinator.url!, 'b');
			b.send('ready', { shard: 0, generation: 'wrong-owner' });
			await until(() => b.closed);
		} finally {
			await s.close();
		}
	});
	test('checks response session identity, ignores stale replies and drains routes on disconnect', async () => {
		const s = await stack();
		const peers: Awaited<ReturnType<typeof peer>>[] = [];
		try {
			const a = await peer(s.coordinator.url!, 'a');
			const b = await peer(s.coordinator.url!, 'b');
			peers.push(a, b);
			a.send('ready', { shard: 0, generation: 'a1' });
			b.send('ready', { shard: 1, generation: 'b1' });
			await until(() => s.coordinator.workers.every((w) => w.shards.length === 1));
			const request = a.send('call', { source: 0, target: 1, name: 'probe', payload: null, timeoutMs: 1000 });
			const invocation = await b.next('invoke');
			a.send('result', { shard: 1, generation: 'b1', result: { ok: true, value: 'forged' } }, invocation.id);
			await until(() => a.closed);
			await until(() => s.coordinator.pendingCount === 0);
			b.send('result', { shard: 1, generation: 'b1', result: { ok: true, value: 'late' } }, invocation.id);
			const ping = b.send('ping');
			await b.next('pong', ping);
			expect(b.closed).toBe(false);
			void request;
		} finally {
			await Promise.all(peers.map((p) => p.close()));
			await s.close();
		}
	});
	test('bounds pending requests, times out handlers and rejects duplicate operation IDs', async () => {
		const s = await stack({ limits: { maxPending: 1 } });
		const peers: Awaited<ReturnType<typeof peer>>[] = [];
		try {
			const a = await peer(s.coordinator.url!, 'a');
			const b = await peer(s.coordinator.url!, 'b');
			peers.push(a, b);
			a.send('ready', { shard: 0, generation: 'a1' });
			b.send('ready', { shard: 1, generation: 'b1' });
			await until(() => s.coordinator.workers.every((w) => w.shards.length === 1));
			const data = { source: 0, target: 1, name: 'probe', payload: null, timeoutMs: 100 };
			const first = a.send('call', data);
			await b.next('invoke');
			const second = a.send('call', data);
			expect((await a.next('reply', second)).data.error.code).toBe('CAPACITY');
			expect((await a.next('reply', first)).data.error.code).toBe('TIMEOUT');
			expect(s.coordinator.pendingCount).toBe(0);
			const duplicate = a.send('call', { ...data, timeoutMs: 1000 });
			a.send('call', data, duplicate);
			await until(() => a.closed);
		} finally {
			await Promise.all(peers.map((p) => p.close()));
			await s.close();
		}
	});
	test('coordinates identify buckets, exhaustion, cancellation and conservative readiness', async () => {
		const s = await stack({ sessionStartLimit: { total: 2, remaining: 2, reset_after: 60000, max_concurrency: 1 } });
		const peers: Awaited<ReturnType<typeof peer>>[] = [];
		try {
			const a = await peer(s.coordinator.url!, 'a');
			const b = await peer(s.coordinator.url!, 'b');
			peers.push(a, b);
			a.send('ready', { shard: 0, generation: 'a1' });
			b.send('ready', { shard: 1, generation: 'b1' });
			const first = a.send('identify', { shard: 0, generation: 'a1', timeoutMs: 200 });
			expect((await a.next('reply', first)).data.ok).toBe(true);
			const blocked = b.send('identify', { shard: 1, generation: 'b1', timeoutMs: 100 });
			expect((await b.next('reply', blocked)).data.error.code).toBe('IDENTIFY_TIMEOUT');
			const cancel = b.send('identify', { shard: 1, generation: 'b1', timeoutMs: 1000 });
			b.send('cancel', {}, cancel);
			expect((await b.next('reply', cancel)).data.error.code).toBe('ABORTED');
			a.send('done', { shard: 0, generation: 'a1' });
			const start = performance.now();
			const next = b.send('identify', { shard: 1, generation: 'b1', timeoutMs: 8000 });
			expect((await b.next('reply', next, 9000)).data.ok).toBe(true);
			expect(performance.now() - start).toBeGreaterThanOrEqual(5400);
			b.send('done', { shard: 1, generation: 'b1' });
			const exhausted = a.send('identify', { shard: 0, generation: 'a1', timeoutMs: 100 });
			expect((await a.next('reply', exhausted)).data.error.code).toBe('IDENTIFY_TIMEOUT');
		} finally {
			await Promise.all(peers.map((p) => p.close()));
			await s.close();
		}
	}, 15000);
	test('requires encrypted remote endpoints and unique complete assignments', async () => {
		const s = await stack();
		try {
			expect(() => new ShardManager({ id: 'a', token: tokenA, url: 'ws://192.0.2.1:8080/sharding', script: fixture })).toThrow('wss');
			expect(() => new ShardCoordinator({ ...s.base, hostname: '0.0.0.0' })).toThrow('TLS');
			expect(() => new ShardCoordinator({ ...s.base, workers: [{ id: 'a', token: tokenA, shards: [0, 0] }] })).toThrow('unique');
			expect(() => new ShardCoordinator({ ...s.base, workers: [{ id: 'a', token: tokenA, shards: [0] }] })).toThrow('every');
		} finally {
			await s.close();
		}
	});
});
