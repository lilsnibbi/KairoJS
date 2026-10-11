import type { IterableResolvable } from './from';
import { assertFunction } from './shared/_assertFunction';
import { toIterableIterator } from './toIterableIterator';

/** Advances the iterable until it finds the element, returning its index if it's found and `-1` otherwise. */
export function findIndex<const ElementType>(
	iterable: IterableResolvable<ElementType>,
	callbackFn: (element: ElementType, index: number) => boolean
): number {
	callbackFn = assertFunction(callbackFn);

	let index = 0;
	for (const element of toIterableIterator(iterable)) {
		if (callbackFn(element, index)) {
			return index;
		}

		index++;
	}

	return -1;
}
