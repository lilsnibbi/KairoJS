import type { IterableResolvable } from "./from";
import { toIterableIterator } from "./toIterableIterator";

/** Consumes the iterable until it's exhausted, returning the last element. */
export function last<const ElementType>(
	iterable: IterableResolvable<ElementType>,
): ElementType | undefined {
	let last: ElementType | undefined;
	for (const value of toIterableIterator(iterable)) {
		last = value;
	}

	return last;
}
