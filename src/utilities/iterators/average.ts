import type { IterableResolvable } from "./from";
import { map } from "./map";
import {
	type NumberResolvable,
	toNumberOrThrow,
} from "./shared/_toNumberOrThrow";

/** Consumes the iterable and returns the average value of all the elements. If the iterable is empty, it returns `null`. */
export function average(
	iterable: IterableResolvable<NumberResolvable>,
): number | null {
	let sum = 0;
	let total = 0;
	for (const value of map(iterable, toNumberOrThrow)) {
		sum += value;
		total++;
	}

	return total === 0 ? null : sum / total;
}
