import type { IterableResolvable } from './from';
import { assertFunction } from './shared/_assertFunction';
import { toIterableIterator } from './toIterableIterator';

/** Create an iterable that yields the elements of each iterable returned by the provided function on each element of the input iterable. */
export function* flatMap<const ElementType, const MappedType>(
	iterable: IterableResolvable<ElementType>,
	callbackFn: (element: ElementType, index: number) => IterableResolvable<MappedType>
): IterableIterator<MappedType> {
	callbackFn = assertFunction(callbackFn);

	let index = 0;
	for (const value of toIterableIterator(iterable)) {
		yield* toIterableIterator(callbackFn(value, index++));
	}
}
