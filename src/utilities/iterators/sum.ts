import type { IterableResolvable } from "./from";
import { map } from "./map";
import {
	type NumberResolvable,
	toNumberOrThrow,
} from "./shared/_toNumberOrThrow";

/** Consumes the iterable and returns the sum of all the elements. */
export function sum(iterable: IterableResolvable<NumberResolvable>) {
	let sum = 0;
	for (const value of map(iterable, toNumberOrThrow)) {
		sum += value;
	}

	return sum;
}
