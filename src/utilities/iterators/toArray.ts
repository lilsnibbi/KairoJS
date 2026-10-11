import type { IterableResolvable } from './from';
import { toIterableIterator } from './toIterableIterator';

/** Consumes the iterable and returns an array with all the elements. */
export function toArray<const ElementType>(iterable: IterableResolvable<ElementType>): ElementType[] {
	return [...toIterableIterator(iterable)];
}
