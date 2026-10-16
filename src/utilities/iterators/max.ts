import type { IterableResolvable } from "./from";
import { maxBy } from "./maxBy";
import { defaultCompare } from "./shared/comparators";

/** Consumes the iterable and returns the highest number element. */
export function max<const ElementType>(
	iterable: IterableResolvable<ElementType>,
): ElementType | null {
	return maxBy(iterable, defaultCompare);
}
