import { compare } from "./compare";
import type { IterableResolvable } from "./from";
import {
	type LexicographicComparison,
	orderingIsGreater,
} from "./shared/_compare";

/** Check if the elements of `iterable` are {@link LexicographicComparison lexicographically} greater than those of another. */
export function greaterThan<const ElementType>(
	iterable: IterableResolvable<ElementType>,
	other: IterableResolvable<ElementType>,
): boolean {
	const result = compare(iterable, other);
	return orderingIsGreater(result);
}

export { greaterThan as gt };
