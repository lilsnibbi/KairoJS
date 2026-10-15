import type { IterableResolvable } from './from';
import { assertFunction } from './shared/_assertFunction';
import { toIterableIterator } from './toIterableIterator';

/** Tests whether all elements in the iterable pass the test implemented by the provided function. */
export function every<const ElementType, const FilteredType extends ElementType>(
	iterable: IterableResolvable<ElementType>,
	callbackFn: (element: ElementType, index: number) => element is FilteredType
): iterable is IterableIterator<FilteredType>;
export function every<const ElementType>(
	iterable: IterableResolvable<ElementType>,
	callbackFn: (element: ElementType, index: number) => boolean
): boolean;
export function every<const ElementType>(
	iterable: IterableResolvable<ElementType>,
	callbackFn: (element: ElementType, index: number) => boolean
) {
	callbackFn = assertFunction(callbackFn);

	let index = 0;
	for (const value of toIterableIterator(iterable)) {
		if (!callbackFn(value, index++)) return false;
	}

	return true;
}
