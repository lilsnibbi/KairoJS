import { integer } from "../common";
import { merge } from "./merge";
import type { $CacheEntry, $Patch } from "./types";

/** Synchronous Map-backed LRU. Only get, touch and writes change recency. */
export class CacheStore<T extends object> implements Iterable<
	[string, $CacheEntry<T>]
> {
	private readonly items = new Map<string, $CacheEntry<T>>();

	public constructor(public readonly limit = Number.POSITIVE_INFINITY) {
		if (limit !== Number.POSITIVE_INFINITY) integer(limit, "cache limit");
	}
	public get size(): number {
		return this.items.size;
	}
	public has(id: string): boolean {
		return this.items.has(id);
	}
	public peek(id: string): $CacheEntry<T> | undefined {
		return this.items.get(id);
	}
	public get(id: string): $CacheEntry<T> | undefined {
		this.touch(id);
		return this.items.get(id);
	}
	public touch(id: string): void {
		const entry = this.items.get(id);
		if (!entry) return;
		this.items.delete(id);
		this.items.set(id, entry);
	}
	public put(id: string, data: T): $CacheEntry<T> | undefined {
		return this.write(id, data, true);
	}
	public patch(id: string, data: $Patch<T>): $CacheEntry<T> | undefined {
		return this.write(id, data, false);
	}
	private write(
		id: string,
		patch: object,
		complete: boolean,
	): $CacheEntry<T> | undefined {
		if (!this.limit) return undefined;
		let entry = this.items.get(id);
		if (!entry) {
			// This is the single completeness boundary; callers use put only with native full entities.
			entry = { complete, data: {} } as $CacheEntry<T>;
		}
		merge(entry.data, patch);
		if (complete) entry.complete = true;
		this.items.delete(id);
		this.items.set(id, entry);
		if (this.items.size > this.limit) {
			const first = this.items.keys().next();
			if (!first.done) this.items.delete(first.value);
		}
		return entry;
	}
	public delete(id: string): $CacheEntry<T> | undefined {
		const previous = this.items.get(id);
		this.items.delete(id);
		return previous;
	}
	public clear(): void {
		this.items.clear();
	}
	public values(): MapIterator<$CacheEntry<T>> {
		return this.items.values();
	}
	public keys(): MapIterator<string> {
		return this.items.keys();
	}
	public [Symbol.iterator](): MapIterator<[string, $CacheEntry<T>]> {
		return this.items.entries();
	}
}
