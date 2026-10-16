import { from, type IterableResolvable } from "./from";

/** Consumes the first element of the iterable, returning it if it's found and `undefined` otherwise. */
export function first<const ElementType>(
	iterable: IterableResolvable<ElementType>,
): ElementType | undefined {
	return from(iterable).next().value;
}
