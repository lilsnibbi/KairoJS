import { empty } from './empty';
import type { IterableResolvable } from './from';
import { assertNotNegative } from './shared/_assertNotNegative';
import { toIntegerOrInfinityOrThrow } from './shared/_toIntegerOrInfinityOrThrow';
import { take } from './take';
import { toArray } from './toArray';

/** Consumes the iterable, creating a new iterator without the last `count` elements from the iterable. */
export function dropLast<const ElementType>(iterable: IterableResolvable<ElementType>, count: number): IterableIterator<ElementType> {
	count = assertNotNegative(toIntegerOrInfinityOrThrow(count), count);
	const array = toArray(iterable);
	if (array.length <= count) return empty();
	return take(array.values(), array.length - count);
}
