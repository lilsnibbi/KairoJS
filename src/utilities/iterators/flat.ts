import type { IterableResolvable } from "./from";
import { toIterableIterator } from "./toIterableIterator";

/** Create an iterable that yields the elements of each iterable in the input iterable. */
export function* flat<const ElementType>(
	iterables: IterableResolvable<IterableResolvable<ElementType>>,
): IterableIterator<ElementType> {
	for (const value of toIterableIterator(iterables)) {
		yield* toIterableIterator(value);
	}
}
