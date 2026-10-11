import { compareBy } from './compareBy';
import type { IterableResolvable } from './from';
import type { LexicographicComparison } from './shared/_compare';
import { defaultCompare } from './shared/comparators';

/** {@link LexicographicComparison Lexicographically} compares the elements of both iterators are equal. */
export function compare<const ElementType>(
	iterable: IterableResolvable<ElementType>,
	other: IterableResolvable<ElementType>
): LexicographicComparison {
	return compareBy(iterable, other, defaultCompare);
}
