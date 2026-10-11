import { compare } from './compare';
import type { IterableResolvable } from './from';
import { type LexicographicComparison, orderingIsLess } from './shared/_compare';

/** Check if the elements of `iterable` are {@link LexicographicComparison lexicographically} less than those of another. */
export function lessThan<const ElementType>(iterable: IterableResolvable<ElementType>, other: IterableResolvable<ElementType>): boolean {
	const result = compare(iterable, other);
	return orderingIsLess(result);
}

export { lessThan as lt };
