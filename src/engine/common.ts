/** Injectable time and randomness keep failure paths deterministic. */
export interface $Clock {
	now(): number;
	random(): number;
	setTimeout(callback: () => void, milliseconds: number): unknown;
	clearTimeout(handle: unknown): void;
}

export const systemClock: $Clock = {
	now: () => performance.now(),
	random: Math.random,
	setTimeout: (callback, milliseconds) => setTimeout(callback, milliseconds),
	clearTimeout: (handle) =>
		clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export function record(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function integer(value: number, name: string, minimum = 0): number {
	if (!Number.isSafeInteger(value) || value < minimum)
		throw new RangeError(`${name} must be an integer >= ${minimum}`);
	return value;
}

export function errorOf(cause: unknown): Error {
	return cause instanceof Error ? cause : new Error(String(cause));
}

export function delay(
	clock: $Clock,
	milliseconds: number,
	signal: AbortSignal,
): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal.aborted) return reject(signal.reason);
		const abort = () => {
			clock.clearTimeout(timer);
			reject(signal.reason);
		};
		const timer = clock.setTimeout(
			() => {
				signal.removeEventListener("abort", abort);
				resolve();
			},
			Math.max(0, milliseconds),
		);
		signal.addEventListener("abort", abort, { once: true });
	});
}

export function endpoint(input: string, websocket = false): URL {
	const url = new URL(input);
	const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
	if (
		url.username ||
		url.password ||
		url.hash ||
		(url.protocol !== (websocket ? "wss:" : "https:") &&
			!(local && url.protocol === (websocket ? "ws:" : "http:")))
	)
		throw new TypeError("Endpoints require TLS, except loopback test servers.");
	return url;
}
