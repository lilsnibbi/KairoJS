import { toNumberOrThrow } from "./shared/_toNumberOrThrow";

/** Create an iterable with the numbers from `start` to `stop` (exclusive) with an optional step. */
export function* range(
	start: number,
	end: number,
	step?: number | undefined,
): IterableIterator<number> {
	start = toNumberOrThrow(start);
	end = toNumberOrThrow(end);

	if (step === undefined) {
		step = start < end ? 1 : -1;
	} else {
		step = toNumberOrThrow(step);

		// Prevent infinite loops.
		if (step === 0) {
			throw new RangeError("Step cannot be zero");
		}

		// If the step is positive, the start must be less than the end.
		if (step > 0 && start > end) {
			throw new RangeError("Start must be less than end when step is positive");
		} else if (step < 0 && start < end) {
			throw new RangeError(
				"Start must be greater than end when step is negative",
			);
		}
	}

	if (start < end) {
		for (let i = start; i < end; i += step) {
			yield i;
		}
	} else {
		for (let i = start; i > end; i += step) {
			yield i;
		}
	}
}
