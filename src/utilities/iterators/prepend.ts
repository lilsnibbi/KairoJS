import type { IterableResolvable } from "./from";
import { toIterableIterator } from "./toIterableIterator";

/** Create an iterator with the provided iterables prepended to the first iterable. */
export function* prepend<const ElementType>(
	iterable: IterableResolvable<ElementType>,
	...iterables: IterableResolvable<ElementType>[]
): IterableIterator<ElementType> {
	for (const iterable of iterables) {
		yield* toIterableIterator(iterable);
	}

	yield* toIterableIterator(iterable);
}
