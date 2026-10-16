import type { IterableResolvable } from "./from";
import { isSortedBy } from "./isSortedBy";
import { defaultCompare } from "./shared/comparators";

/** Check if the elements of this iterator are sorted in ascending order. */
export function isSorted<const ElementType>(
	iterable: IterableResolvable<ElementType>,
): boolean {
	return isSortedBy(iterable, defaultCompare);
}
