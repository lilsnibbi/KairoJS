import { filter } from "./filter";
import type { IterableResolvable } from "./from";

/** Create a new iterable that yields all the non-nullish values (`null` and `undefined`) from the iterable. */
export function compact<const ElementType>(
	iterable: IterableResolvable<ElementType | null | undefined>,
): IterableIterator<ElementType> {
	return filter(
		iterable,
		(value): value is ElementType => value !== null && value !== undefined,
	);
}
