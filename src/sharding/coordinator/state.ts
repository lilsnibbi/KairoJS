// Modified from discord-sharding's durable ownership and identify scheduling design.
// Apache-2.0; see ../LICENSE and ../../../docs/source-retention.md. No upstream database compatibility.
import { Database } from 'bun:sqlite';
import { type } from 'arktype';
import { ShardError, type ShardSessionLimit } from '../types';

const limitSchema = type({
	total: 'number.integer > 0',
	remaining: 'number.integer >= 0',
	reset_after: 'number.integer > 0',
	max_concurrency: 'number.integer > 0',
	'+': 'reject'
});
interface Budget {
	total: number;
	remaining: number;
	resetAt: number;
	concurrency: number;
}
interface Bucket {
	until: number;
	owner?: string;
	shard?: number;
	generation?: string;
}
export class CoordinatorState {
	private readonly db: Database;
	private budget?: Budget;
	private buckets: Record<string, Bucket> = {};
	private readonly deadlines = new Map<string, number>();
	public constructor(
		path: string,
		topology: string,
		private readonly now: () => number = () => performance.now()
	) {
		this.db = new Database(path, { create: true, strict: true });
		try {
			this.db.exec(
				'PRAGMA journal_mode=DELETE; PRAGMA locking_mode=EXCLUSIVE; PRAGMA synchronous=FULL; BEGIN EXCLUSIVE; CREATE TABLE IF NOT EXISTS kairo_sharding (key TEXT PRIMARY KEY, value TEXT NOT NULL); COMMIT;'
			);
			const saved = this.read<string>('topology');
			if (saved && saved !== topology)
				throw new ShardError('TOPOLOGY', 'Stop and fence all hosts before changing the persisted shard topology; use a new state file.');
			this.write('topology', topology);
			this.budget = this.read<Budget>('budget');
			this.buckets = this.read<Record<string, Bucket>>('buckets') ?? {};
			if (this.budget) {
				type({
					total: 'number.integer > 0',
					remaining: 'number.integer >= 0',
					resetAt: 'number.integer > 0',
					concurrency: 'number.integer > 0 & number <= 4096',
					'+': 'reject'
				}).assert(this.budget);
				if (this.budget.remaining > this.budget.total) throw new ShardError('STATE', 'Persisted session allowance is invalid.');
			}
			for (const [key, bucket] of Object.entries(this.buckets)) {
				if (!/^\d{1,4}$/.test(key)) throw new ShardError('STATE', 'Invalid persisted identify bucket.');
				type({
					until: 'number.integer >= 0',
					'owner?': 'string',
					'shard?': 'number.integer >= 0',
					'generation?': 'string',
					'+': 'reject'
				}).assert(bucket);
				this.deadlines.set(key, this.now() + Math.max(5500, bucket.until - Date.now()));
			}
		} catch (error) {
			this.db.close();
			throw error;
		}
	}
	public claim(worker: string, instance: string): void {
		const current = this.read<string>(`owner:${worker}`);
		if (current && current !== instance)
			throw new ShardError('OWNERSHIP', 'Worker identity is reserved. Fence its old processes before releaseWorker().');
		this.write(`owner:${worker}`, instance);
	}
	public release(worker: string): void {
		this.db.query('DELETE FROM kairo_sharding WHERE key = ?').run(`owner:${worker}`);
		this.stopped(worker);
	}
	/** A registration proves this same supervisor finished stopping its old children. */
	public stopped(worker: string, shard?: number, generation?: string): void {
		let changed = false;
		for (const [key, bucket] of Object.entries(this.buckets)) {
			if (bucket.owner !== worker || (shard !== undefined && (bucket.shard !== shard || bucket.generation !== generation))) continue;
			bucket.until = Date.now() + 5500;
			this.deadlines.set(key, this.now() + 5500);
			delete bucket.owner;
			delete bucket.shard;
			delete bucket.generation;
			changed = true;
		}
		if (changed) this.write('buckets', this.buckets);
	}
	public update(value: ShardSessionLimit): void {
		limitSchema.assert(value);
		if (value.remaining > value.total || value.total > 1000000 || value.max_concurrency > 4096 || value.reset_after > 604800000)
			throw new TypeError('Invalid Discord session-start limit.');
		const now = Date.now();
		// A restart or an older gateway response must never replenish an unexpired local budget.
		const old = this.budget;
		if (
			old &&
			old.concurrency !== value.max_concurrency &&
			(old.resetAt > now ||
				Object.values(this.buckets).some((b) => b.owner) ||
				[...this.deadlines.values()].some((deadline) => deadline > this.now()))
		)
			throw new ShardError('SESSION_LIMIT', 'max_concurrency changed while the previous session window or identify buckets are active.');
		this.budget = {
			total: value.total,
			remaining: old && old.resetAt > now ? Math.min(old.remaining, value.remaining) : value.remaining,
			resetAt: old && old.resetAt > now ? Math.max(old.resetAt, now + value.reset_after) : now + value.reset_after,
			concurrency: value.max_concurrency
		};
		this.write('budget', this.budget);
	}
	public get expired(): boolean {
		return !this.budget || Date.now() >= this.budget.resetAt;
	}
	public get remaining(): number {
		return this.expired ? 0 : this.budget!.remaining;
	}
	public grant(worker: string, shard: number, generation: string): boolean {
		const budget = this.budget;
		if (!budget || this.expired || budget.remaining <= 0) return false;
		const key = String(shard % budget.concurrency);
		const bucket = this.buckets[key];
		if (bucket && (bucket.owner || (this.deadlines.get(key) ?? 0) > this.now())) return false;
		budget.remaining--;
		this.buckets[key] = { until: Date.now() + 5500, owner: worker, shard, generation };
		this.deadlines.set(key, this.now() + 5500);
		this.db.transaction(() => {
			this.write('budget', budget);
			this.write('buckets', this.buckets);
		})();
		return true;
	}
	public close(): void {
		this.db.close();
	}
	private read<T>(key: string): T | undefined {
		const row = this.db.query<{ value: string }, [string]>('SELECT value FROM kairo_sharding WHERE key = ?').get(key);
		return row ? (JSON.parse(row.value) as T) : undefined;
	}
	private write(key: string, value: unknown): void {
		this.db.query('INSERT OR REPLACE INTO kairo_sharding (key,value) VALUES (?,?)').run(key, JSON.stringify(value));
	}
}
