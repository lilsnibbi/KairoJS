import type { IterableResolvable } from "./from";
import { toArray } from "./toArray";

/** Consumes the iterable and returns a new iterable with the elements sorted. */
export function sorted<const ElementType>(
	iterable: IterableResolvable<ElementType>,
	compareFn?: (a: ElementType, b: ElementType) => number,
): IterableIterator<ElementType> {
	return toArray(iterable).sort(compareFn).values();
}
