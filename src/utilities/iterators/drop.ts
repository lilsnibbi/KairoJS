import { empty } from './empty';
import type { IterableResolvable } from './from';
import { assertNotNegative } from './shared/_assertNotNegative';
import { toIntegerOrInfinityOrThrow } from './shared/_toIntegerOrInfinityOrThrow';
import { toIterableIterator } from './toIterableIterator';

/** Advances the iterable by `count` elements from the iterable. */
export function drop<const ElementType>(iterable: IterableResolvable<ElementType>, count: number): IterableIterator<ElementType> {
	count = assertNotNegative(toIntegerOrInfinityOrThrow(count), count);
	const resolvedIterable = toIterableIterator(iterable);

	// If the count is 0, return the original iterable:
	if (count === 0) return resolvedIterable;
	// If the count is infinite, return an empty iterable:
	if (count === Number.POSITIVE_INFINITY) return empty();

	for (let i = 0; i < count; i++) {
		if (resolvedIterable.next().done) break;
	}

	return resolvedIterable;
}
