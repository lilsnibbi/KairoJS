import { CacheStore } from './CacheStore';
import type { $CacheEntry, $Patch } from './types';

/** Each scope has its own limit; there is deliberately no combined member limit. */
export class ScopedCache<T extends object> {
	private readonly scopes = new Map<string, CacheStore<T>>();
	public constructor(private readonly limit: number | ((scope: string) => number)) {}
	public get scopeCount(): number {
		return this.scopes.size;
	}
	public size(scope: string): number {
		return this.scopes.get(scope)?.size ?? 0;
	}
	public get(scope: string, id: string): $CacheEntry<T> | undefined {
		return this.scopes.get(scope)?.get(id);
	}
	public peek(scope: string, id: string): $CacheEntry<T> | undefined {
		return this.scopes.get(scope)?.peek(id);
	}
	public touch(scope: string, id: string): void {
		this.scopes.get(scope)?.touch(id);
	}
	public put(scope: string, id: string, data: T): $CacheEntry<T> | undefined {
		return this.store(scope)?.put(id, data);
	}
	public patch(scope: string, id: string, data: $Patch<T>): $CacheEntry<T> | undefined {
		return this.store(scope)?.patch(id, data);
	}
	public delete(scope: string, id: string): $CacheEntry<T> | undefined {
		const store = this.scopes.get(scope);
		const previous = store?.delete(id);
		if (!store?.size) this.scopes.delete(scope);
		return previous;
	}
	public clear(scope?: string): void {
		if (scope === undefined) this.scopes.clear();
		else this.scopes.delete(scope);
	}
	public *entries(scope: string): IterableIterator<[string, $CacheEntry<T>]> {
		const store = this.scopes.get(scope);
		if (store) yield* store;
	}
	public *values(scope: string): IterableIterator<$CacheEntry<T>> {
		const store = this.scopes.get(scope);
		if (store) yield* store.values();
	}
	public scopeIds(): MapIterator<string> {
		return this.scopes.keys();
	}
	private store(scope: string): CacheStore<T> | undefined {
		if (this.limit === 0) return undefined;
		const current = this.scopes.get(scope);
		if (current) return current;
		const store = new CacheStore<T>(typeof this.limit === 'number' ? this.limit : this.limit(scope));
		if (!store.limit) return undefined;
		this.scopes.set(scope, store);
		return store;
	}
}
