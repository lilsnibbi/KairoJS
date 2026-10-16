import { compare } from "./compare";
import type { IterableResolvable } from "./from";
import {
	type LexicographicComparison,
	orderingIsGreater,
} from "./shared/_compare";

/** Check if the elements of `iterable` are {@link LexicographicComparison lexicographically} less or equal than those of another. */
export function lessOrEqualThan<const ElementType>(
	iterable: IterableResolvable<ElementType>,
	other: IterableResolvable<ElementType>,
): boolean {
	const result = compare(iterable, other);
	return !orderingIsGreater(result);
}

export { lessOrEqualThan as le };
