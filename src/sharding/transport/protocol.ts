// Modified design adapted from discord-sharding's validated, correlated protocol.
// Apache-2.0 attribution and full licence: ../LICENSE and ../../../docs/source-retention.md.
import { timingSafeEqual } from 'node:crypto';
import { type } from 'arktype';
import { ShardError, type ShardLimits } from '../types';

export const identifier = type('string').narrow((v) => /^[a-zA-Z0-9:_-]{1,128}$/.test(v));
export const integer = type('number.integer >= 0');
const outcome = type({ ok: 'true', value: 'unknown', '+': 'reject' }).or({
	ok: 'false',
	error: { code: identifier, message: 'string <= 500', '+': 'reject' },
	'+': 'reject'
});
const schemas = {
	welcome: type({
		shards: integer.array(),
		count: 'number.integer > 0',
		limits: { maxBytes: integer, maxPending: integer, maxBufferedBytes: integer, timeoutMs: integer }
	}),
	boot: type({}),
	stop: type({}),
	ping: type({}),
	pong: type({}),
	release: type({}),
	released: type({}),
	ready: type({ shard: integer, generation: identifier }),
	offline: type({ shard: integer, generation: identifier }),
	done: type({ shard: integer, generation: identifier }),
	identify: type({ shard: integer, generation: identifier, timeoutMs: 'number.integer > 0' }),
	call: type({ source: 'number.integer >= -1', target: integer, name: identifier, payload: 'unknown', timeoutMs: 'number.integer > 0' }),
	invoke: type({
		source: 'number.integer >= -1',
		target: integer,
		generation: identifier,
		name: identifier,
		payload: 'unknown',
		timeoutMs: 'number.integer > 0'
	}),
	reply: outcome,
	result: type({ shard: integer, generation: identifier, result: outcome }),
	cancel: type({})
};
export type Op = keyof typeof schemas;
export interface Frame {
	v: 1;
	op: Op;
	id: string;
	data: any;
}
const envelope = type({ v: '1', op: identifier, id: identifier, data: 'object', '+': 'reject' });
export type Limits = Required<ShardLimits>;
export function limits(input: ShardLimits = {}): Limits {
	const value = { maxBytes: 65536, maxPending: 256, maxBufferedBytes: 262144, timeoutMs: 15000, ...input };
	type({
		maxBytes: 'number.integer >= 1024 & number <= 1048576',
		maxPending: 'number.integer >= 1 & number <= 4096',
		maxBufferedBytes: 'number.integer >= 1024 & number <= 16777216',
		timeoutMs: 'number.integer >= 1 & number <= 300000',
		'+': 'reject'
	}).assert(value);
	if (value.maxBufferedBytes < value.maxBytes) throw new TypeError('maxBufferedBytes must cover maxBytes.');
	return Object.freeze(value);
}
export function timeout(value: number): number {
	if (!Number.isSafeInteger(value) || value < 1 || value > 300000) throw new ShardError('CONFIG', 'Deadline must be 1..300000ms.');
	return value;
}
export function frame(op: Op, id: string = crypto.randomUUID(), data: any = {}): Frame {
	return { v: 1, op, id, data };
}
/** Refuse lossy JSON (undefined, cycles, accessors, classes, non-finite numbers) and bound depth/nodes. */
export function encode(value: unknown, maxBytes: number): string {
	let nodes = 0;
	const seen = new Set<object>();
	function visit(v: unknown, depth: number): void {
		if (++nodes > 10000 || depth > 32) throw new ShardError('PAYLOAD', 'JSON depth/node limit exceeded.');
		if (v === null || typeof v === 'string' || typeof v === 'boolean') return;
		if (typeof v === 'number' && Number.isFinite(v)) return;
		if (typeof v !== 'object' || !v || seen.has(v)) throw new ShardError('PAYLOAD', 'Expected acyclic JSON values.');
		if (!Array.isArray(v) && Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null)
			throw new ShardError('PAYLOAD', 'Only plain JSON objects are supported.');
		seen.add(v);
		if (Array.isArray(v)) {
			if (
				Reflect.ownKeys(v).some(
					(key) => key !== 'length' && (typeof key !== 'string' || !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= v.length)
				)
			)
				throw new ShardError('PAYLOAD', 'Array data properties would be lost in JSON.');
			for (let i = 0; i < v.length; i++) {
				const descriptor = Object.getOwnPropertyDescriptor(v, String(i));
				if (!descriptor || !('value' in descriptor)) throw new ShardError('PAYLOAD', 'Sparse arrays/accessors are unsupported.');
				visit(descriptor.value, depth + 1);
			}
		} else
			for (const key of Reflect.ownKeys(v)) {
				const descriptor = Object.getOwnPropertyDescriptor(v, key)!;
				if (typeof key !== 'string' || !descriptor.enumerable || !('value' in descriptor))
					throw new ShardError('PAYLOAD', 'Only JSON data properties are supported.');
				visit(descriptor.value, depth + 1);
			}
		seen.delete(v);
	}
	visit(value, 0);
	const encoded = JSON.stringify(value);
	if (Buffer.byteLength(encoded) > maxBytes) throw new ShardError('PAYLOAD', 'Message exceeds maxBytes.');
	return encoded;
}
export function decode(value: unknown, maxBytes: number, allowed: readonly Op[]): Frame {
	if (typeof value !== 'string' || Buffer.byteLength(value) > maxBytes) throw new ShardError('PROTOCOL', 'Expected bounded JSON text.');
	const parsed = envelope.assert(JSON.parse(value));
	const op = parsed.op as Op;
	if (!allowed.includes(op) || !Object.hasOwn(schemas, op)) throw new ShardError('PROTOCOL', 'Unexpected message operation.');
	encode(parsed, maxBytes);
	const schema = schemas[op];
	const data = schema.assert(parsed.data);
	// ArkType validates values; explicitly reject undeclared keys on every message shape.
	const keys: Record<Op, readonly string[]> = {
		welcome: ['shards', 'count', 'limits'],
		boot: [],
		stop: [],
		ping: [],
		pong: [],
		release: [],
		released: [],
		ready: ['shard', 'generation'],
		offline: ['shard', 'generation'],
		done: ['shard', 'generation'],
		identify: ['shard', 'generation', 'timeoutMs'],
		call: ['source', 'target', 'name', 'payload', 'timeoutMs'],
		invoke: ['source', 'target', 'generation', 'name', 'payload', 'timeoutMs'],
		reply: ['ok', 'value', 'error'],
		result: ['shard', 'generation', 'result'],
		cancel: []
	};
	if (Object.keys(data).some((key) => !keys[op].includes(key))) throw new ShardError('PROTOCOL', 'Unexpected message fields.');
	return parsed as Frame;
}
export function failure(error: unknown): { ok: false; error: { code: string; message: string } } {
	let message = '';
	let bytes = 0;
	// Bound escaped UTF-8 too, so errors fit even the minimum message limit.
	for (const character of (error instanceof Error ? error.message : 'Handler failed.').slice(0, 500)) {
		bytes += Buffer.byteLength(JSON.stringify(character)) - 2;
		if (bytes > 500) break;
		message += character;
	}
	return {
		ok: false,
		error: {
			code: error instanceof ShardError && identifier.allows(error.code) ? error.code : 'HANDLER',
			message
		}
	};
}
export function tokenMatches(actual: string | null, token: string): boolean {
	const expected = Buffer.from(`Bearer ${token}`);
	const received = Buffer.from(actual ?? '');
	return expected.length === received.length && timingSafeEqual(expected, received);
}
export function validateToken(token: string): void {
	if (typeof token !== 'string' || token.length < 32 || token.length > 512 || /[^\x21-\x7e]/.test(token))
		throw new TypeError('Provide a 32..512 character ASCII secret token.');
}
export function loopback(host: string): boolean {
	return ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(host);
}
export function sendSocket(socket: WebSocket | Bun.ServerWebSocket<any>, message: Frame, policy: Limits): void {
	const encoded = encode(message, policy.maxBytes);
	const buffered = 'getBufferedAmount' in socket ? socket.getBufferedAmount() : socket.bufferedAmount;
	if (socket.readyState !== 1 || buffered + Buffer.byteLength(encoded) > policy.maxBufferedBytes)
		throw new ShardError('BACKPRESSURE', 'Transport is closed or its buffer is full.');
	const sent = socket.send(encoded);
	// Bun's -1 means accepted with backpressure: never send that frame again.
	if (sent === 0) throw new ShardError('DISCONNECTED', 'WebSocket dropped the message.');
}
