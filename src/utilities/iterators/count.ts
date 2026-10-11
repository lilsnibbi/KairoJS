import { from, type IterableResolvable } from './from';

/** Consumes the iterable and returns the number of elements. */
export function count<const ElementType>(iterable: IterableResolvable<ElementType>): number {
	let count = 0;
	const resolvedIterable = from(iterable);
	while (!resolvedIterable.next().done) {
		count++;
	}

	return count;
}
