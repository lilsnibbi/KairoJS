import type { IterableResolvable } from './from';
import { union } from './union';

/** Create an iterable with the unique elements of the input iterable. Under the hood, it calls {@linkcode union} with the iterable itself. */
export function unique<const ElementType>(iterable: IterableResolvable<ElementType>): IterableIterator<ElementType> {
	// The union of a single iterator is the iterator itself, with duplicates removed.
	return union(iterable);
}
