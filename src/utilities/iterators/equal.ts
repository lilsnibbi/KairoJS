import { equalBy } from './equalBy';
import type { IterableResolvable } from './from';

/** Check if the elements of both iterators are equal. */
export function equal<const ElementType>(iterable: IterableResolvable<ElementType>, other: IterableResolvable<ElementType>): boolean {
	return equalBy(iterable, other, (a, b) => a === b);
}

export { equal as eq };
