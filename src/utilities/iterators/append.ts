import { chain } from "./chain";
import type { IterableResolvable } from "./from";

/** Appends iterables to the end of the first iterable, returning a new iterable combining all of them. It's similar to concatenating arrays or doing `[...a, ...b, ...c]`. */
export function append<const ElementType>(
	iterable: IterableResolvable<ElementType>,
	...iterables: IterableResolvable<ElementType>[]
): IterableIterator<ElementType> {
	return chain(iterable, ...iterables);
}

export { append as concat };
