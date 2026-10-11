import { filter } from './filter';
import type { IterableResolvable } from './from';
import { toIterableIterator } from './toIterableIterator';

/** Create an iterable with the elements of the first iterable that are not in the second iterable. */
export function difference<const ElementType>(
	first: IterableResolvable<ElementType>,
	second: IterableResolvable<ElementType>
): IterableIterator<ElementType> {
	const set = new Set(toIterableIterator(second));
	return filter(first, (value) => !set.has(value));
}

export { difference as except, difference as omit };
