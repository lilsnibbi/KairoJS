import { drop } from './drop';
import { first } from './first';
import type { IterableResolvable } from './from';
import { assertNotNegative } from './shared/_assertNotNegative';
import { toIntegerOrInfinityOrThrow } from './shared/_toIntegerOrInfinityOrThrow';

/** Advances the iterable to the `n`th element and returns it. If the iterable is exhausted before reaching the `n`th element, it returns `undefined`. */
export function at<const ElementType>(iterable: IterableResolvable<ElementType>, index: number): ElementType | undefined {
	index = assertNotNegative(toIntegerOrInfinityOrThrow(index), index);
	return first(index === 0 ? iterable : drop(iterable, index));
}
