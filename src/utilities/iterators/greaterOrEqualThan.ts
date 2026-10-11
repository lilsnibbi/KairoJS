import { compare } from './compare';
import type { IterableResolvable } from './from';
import { type LexicographicComparison, orderingIsLess } from './shared/_compare';

/** Check if the elements of `iterable` are {@link LexicographicComparison lexicographically} greater or equal than those of another. */
export function greaterOrEqualThan<const ElementType>(
	iterable: IterableResolvable<ElementType>,
	other: IterableResolvable<ElementType>
): boolean {
	const result = compare(iterable, other);
	return !orderingIsLess(result);
}

export { greaterOrEqualThan as ge };
