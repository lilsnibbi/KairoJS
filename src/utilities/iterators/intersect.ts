import { filter } from "./filter";
import type { IterableResolvable } from "./from";
import { toIterableIterator } from "./toIterableIterator";

/** Create an iterable with the elements that are in both input iterables. */
export function intersect<const ElementType>(
	first: IterableResolvable<ElementType>,
	second: IterableResolvable<ElementType>,
): IterableIterator<ElementType> {
	const set = new Set(toIterableIterator(second));
	return filter(first, (value) => set.has(value));
}
