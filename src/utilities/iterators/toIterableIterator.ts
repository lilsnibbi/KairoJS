import { from, type IterableResolvable } from './from';
import { makeIterableIterator } from './shared/_makeIterableIterator';

/** Create an iterable iterator from an iterable or iterator-like object. */
export function toIterableIterator<const ElementType>(iterable: IterableResolvable<ElementType>): IterableIterator<ElementType> {
	const resolvedIterable = from(iterable);
	if (Symbol.iterator in resolvedIterable) {
		return resolvedIterable;
	}

	return makeIterableIterator(() => resolvedIterable.next());
}
