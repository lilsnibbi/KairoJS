import { fallbackLogger } from '../../core/logging/console';
import { writeEvent } from '../../core/logging/diagnostics';
import type { PollOptions } from './poll';
import { sleepSync } from './sleepSync';

/** The options for the {@link pollSync} function */
export interface SyncPollOptions extends Omit<PollOptions, 'signal'> {
	/** The number of milliseconds before throwing an AbortError.
	 * @default Infinite */
	timeout?: number | null | undefined;
}

const DOMException: typeof globalThis.DOMException =
	globalThis.DOMException ??
	// DOMException was only made a global in Node v17.0.0, but this library supports Node v16.0.0 and up
	AbortSignal.abort().reason.constructor;

/** Run a function {@link cb} and validates the result with function {@link cbCondition}, and repeats this until {@link cbCondition} returns `true` or the {@link timeout} is reached.  For an asynchronous variant, see [poll](./poll.d.ts). */
export function pollSync<T>(cb: () => T, cbCondition: (value: T) => boolean, options: SyncPollOptions = {}): T {
	const timeout = options.timeout ?? Infinity;
	if (typeof timeout !== 'number') throw new TypeError('Expected timeout to be a number');
	if (!(timeout >= 0)) throw new RangeError('Expected timeout to be a non-negative number');

	const maximumRetries = options.maximumRetries ?? Infinity;
	if (typeof maximumRetries !== 'number') throw new TypeError('Expected maximumRetries to be a number');
	if (!(maximumRetries >= 0)) throw new RangeError('Expected maximumRetries to be a non-negative number');

	const waitBetweenRetries = options.waitBetweenRetries ?? 0;
	if (typeof waitBetweenRetries !== 'number') throw new TypeError('Expected waitBetweenRetries to be a number');
	if (!Number.isSafeInteger(waitBetweenRetries) || waitBetweenRetries < 0) {
		throw new RangeError('Expected waitBetweenRetries to be a positive safe integer');
	}

	const end = Date.now() + timeout;
	let result = cb();
	for (let retries = 0; retries < maximumRetries && !cbCondition(result); retries++) {
		if (Date.now() + waitBetweenRetries > end) throw new DOMException('This operation was aborted', 'AbortError');
		if (waitBetweenRetries > 0) {
			if (options.verbose)
				writeEvent(fallbackLogger(), 'notif', {
					component: 'utilities.poll',
					event: 'waiting',
					message: 'Poll condition is not satisfied; waiting for the next attempt.',
					context: { delayMs: waitBetweenRetries, attempt: retries + 1, synchronous: true }
				});
			sleepSync(waitBetweenRetries);
		}

		result = cb();
	}

	return result;
}
