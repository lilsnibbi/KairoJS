import { from, type IterableResolvable } from "./from";

/** Advances the iterable once, returning `true` if it's exhausted and `false` otherwise. */
export function isEmpty<const ElementType>(
	iterable: IterableResolvable<ElementType>,
): boolean {
	return from(iterable).next().done ?? false;
}
