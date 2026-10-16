import { equal } from "./equal";
import type { IterableResolvable } from "./from";

/** Check if the elements of both iterators are not equal. */
export function notEqual<const ElementType>(
	iterable: IterableResolvable<ElementType>,
	other: IterableResolvable<ElementType>,
): boolean {
	return !equal(iterable, other);
}

export { notEqual as ne };
