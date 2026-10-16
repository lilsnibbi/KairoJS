import { from, type IterableResolvable } from "./from";
import { assertFunction } from "./shared/_assertFunction";
import { toIterableIterator } from "./toIterableIterator";

/** Check if the elements of both iterators are equal with respect to the specified equality function. */
export function equalBy<const ElementType>(
	iterable: IterableResolvable<ElementType>,
	other: IterableResolvable<ElementType>,
	callbackFn: (x: ElementType, y: ElementType) => boolean,
): boolean {
	callbackFn = assertFunction(callbackFn);

	const iterator1 = from(other);

	for (const value0 of toIterableIterator(iterable)) {
		const result1 = iterator1.next();
		if (result1.done || !callbackFn(value0, result1.value)) return false;
	}

	return iterator1.next().done === true;
}

export { equalBy as eqBy };
