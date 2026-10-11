import type { IterableResolvable } from './from';
import { toIterableIterator } from './toIterableIterator';

/** Create a new iterable that yields the index and value of each element. */
export function* enumerate<const ElementType>(iterable: IterableResolvable<ElementType>): IterableIterator<[number, ElementType]> {
	let index = 0;
	for (const value of toIterableIterator(iterable)) {
		yield [index++, value];
	}
}
