import type { IterableResolvable } from './from';
import { toIterableIterator } from './toIterableIterator';

/** Advances the iterable until it finds the element, returning `true` if it's found and `false` otherwise. */
export function contains<const ElementType>(iterable: IterableResolvable<ElementType>, value: ElementType): boolean {
	for (const element of toIterableIterator(iterable)) {
		if (element === value) return true;
	}

	return false;
}
