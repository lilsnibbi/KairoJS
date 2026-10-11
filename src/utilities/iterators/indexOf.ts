import type { IterableResolvable } from './from';
import { toIterableIterator } from './toIterableIterator';

/** Advances the iterable until it finds the element, returning its index if it's found and `-1` otherwise. */
export function indexOf<const ElementType>(iterable: IterableResolvable<ElementType>, value: ElementType): number {
	let index = 0;
	for (const element of toIterableIterator(iterable)) {
		if (element === value) {
			return index;
		}

		index++;
	}

	return -1;
}
