import type { Awaitable } from "../types";

/** Asynchronously calls the callback function until it either succeeds or it runs out of retries. For a synchronous variant, see [retrySync](./retrySync.d.ts). */
export async function retry<T>(
	cb: () => Awaitable<T>,
	retries: number,
): Promise<T> {
	if (retries < 0) throw new RangeError("Expected retries to be a number >= 0");
	if (retries === 0) return cb();

	let lastError: unknown;
	for (let i = 0; i < retries; ++i) {
		try {
			return await cb();
		} catch (error) {
			lastError = error;
		}
	}

	throw lastError;
}
