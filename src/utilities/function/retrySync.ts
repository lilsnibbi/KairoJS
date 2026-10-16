/** Synchronously calls the callback function until it either succeeds or it runs out of retries. For an asynchronous variant, see [retry](./retry.d.ts). */
export function retrySync<T>(cb: () => T, retries: number): T {
	if (retries < 0) throw new RangeError("Expected retries to be a number >= 0");
	if (retries === 0) return cb();

	let lastError: unknown;
	for (let i = 0; i < retries; ++i) {
		try {
			return cb();
		} catch (error) {
			lastError = error;
		}
	}

	throw lastError;
}
