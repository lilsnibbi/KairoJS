import type { IterableResolvable } from "./from";
import { map } from "./map";
import { toNumberOrThrow } from "./shared/_toNumberOrThrow";

/** Consumes the iterable and returns the product of all the elements. If the iterable is empty, it returns `1`. */
export function product(iterable: IterableResolvable<number>): number {
	let result = 1;
	for (const value of map(iterable, toNumberOrThrow)) {
		result *= value;
	}

	return result;
}
