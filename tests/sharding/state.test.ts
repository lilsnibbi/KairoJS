import { describe, expect, setSystemTime, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { CoordinatorState } from '../../src/sharding/coordinator/state';

function fixture() {
	const folder = mkdtempSync(join(tmpdir(), 'kairo-shard-state-'));
	const path = join(folder, 'state.sqlite');
	return {
		path,
		remove() {
			if (!resolve(folder).startsWith(resolve(tmpdir()) + sep)) throw new Error('Unsafe path');
			rmSync(folder, { recursive: true, force: true });
		}
	};
}
const limit = { total: 10, remaining: 10, reset_after: 100000, max_concurrency: 2 };
describe('durable shard ownership and identify budget', () => {
	test('holds each bucket until actual readiness, then enforces cooldown; separate buckets progress', () => {
		const f = fixture();
		const state = new CoordinatorState(f.path, 'topology', () => Date.now());
		try {
			setSystemTime(new Date('2026-01-01T00:00:00Z'));
			state.update(limit);
			expect(state.grant('a', 0, 'one')).toBe(true);
			expect(state.grant('b', 1, 'two')).toBe(true);
			setSystemTime(new Date('2026-01-01T00:00:20Z'));
			expect(state.grant('a', 2, 'three')).toBe(false);
			state.stopped('a', 0, 'stale');
			expect(state.grant('a', 2, 'three')).toBe(false);
			state.stopped('a', 0, 'one');
			expect(state.grant('a', 2, 'three')).toBe(false);
			setSystemTime(new Date('2026-01-01T00:00:25.499Z'));
			expect(state.grant('a', 2, 'three')).toBe(false);
			setSystemTime(new Date('2026-01-01T00:00:25.500Z'));
			expect(state.grant('a', 2, 'three')).toBe(true);
			expect(state.remaining).toBe(7);
		} finally {
			state.close();
			f.remove();
		}
	});
	test('preserves spent allowance and held permits across restart; snapshots expire without invented refill', () => {
		const f = fixture();
		let state = new CoordinatorState(f.path, 'topology');
		try {
			setSystemTime(new Date('2026-01-01T00:00:00Z'));
			state.update(limit);
			state.grant('a', 0, 'one');
			state.close();
			state = new CoordinatorState(f.path, 'topology');
			state.update(limit);
			expect(state.remaining).toBe(9);
			expect(state.grant('a', 2, 'two')).toBe(false);
			setSystemTime(new Date('2026-01-01T00:02:00Z'));
			expect(state.remaining).toBe(0);
			expect(state.grant('b', 1, 'one')).toBe(false);
			state.update({ ...limit, remaining: 2 });
			expect(state.grant('b', 1, 'one')).toBe(true);
			expect(state.remaining).toBe(1);
		} finally {
			state.close();
			f.remove();
		}
	});
	test('accepts a zero reset interval without dropping or replenishing the reported allowance', () => {
		const f = fixture();
		const state = new CoordinatorState(f.path, 'topology');
		try {
			setSystemTime(new Date('2026-01-01T00:00:00Z'));
			state.update({ ...limit, reset_after: 0 });
			expect(state.remaining).toBe(10);
			expect(state.grant('a', 0, 'one')).toBe(true);
			state.update({ ...limit, reset_after: 0 });
			expect(state.remaining).toBe(9);
			setSystemTime(new Date('2026-01-01T00:00:59.999Z'));
			expect(state.expired).toBe(false);
			setSystemTime(new Date('2026-01-01T00:01:00Z'));
			expect(state.expired).toBe(true);
			expect(state.grant('b', 1, 'two')).toBe(false);
			state.update({ ...limit, remaining: 8, reset_after: 0 });
			expect(state.remaining).toBe(8);
		} finally {
			state.close();
			f.remove();
		}
	});
	test('rejects duplicate coordinators, incompatible topology, and competing host incarnations', () => {
		const f = fixture();
		let state = new CoordinatorState(f.path, 'topology');
		try {
			state.claim('a', 'first');
			state.claim('a', 'first');
			expect(() => state.claim('a', 'second')).toThrow('reserved');
			expect(() => new CoordinatorState(f.path, 'topology')).toThrow();
			state.close();
			expect(() => new CoordinatorState(f.path, 'different')).toThrow('topology');
			state = new CoordinatorState(f.path, 'topology');
			expect(() => state.claim('a', 'second')).toThrow('reserved');
			state.release('a');
			state.claim('a', 'second');
		} finally {
			state.close();
			f.remove();
		}
	});
	test('rejects impossible session metadata', () => {
		const f = fixture();
		const state = new CoordinatorState(f.path, 'topology');
		try {
			for (const value of [
				{ ...limit, remaining: 11 },
				{ ...limit, reset_after: -1 },
				{ ...limit, max_concurrency: 0 }
			])
				expect(() => state.update(value)).toThrow();
		} finally {
			state.close();
			f.remove();
		}
	});
});
