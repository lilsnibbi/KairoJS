import type { IterableResolvable } from "./from";
import { toIterableIterator } from "./toIterableIterator";

/** Similar to `append`, but takes an iterable of iterables and chains them together. */
export function* chain<const ElementType>(
	...iterables: IterableResolvable<ElementType>[]
): IterableIterator<ElementType> {
	for (const iterable of iterables) {
		yield* toIterableIterator(iterable);
	}
}
