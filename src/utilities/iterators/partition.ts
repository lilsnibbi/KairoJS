import type { IterableResolvable } from './from';
import { assertFunction } from './shared/_assertFunction';
import { toIterableIterator } from './toIterableIterator';

/** Consumes the iterable and creates two arrays, one with the elements that pass the test and another with the elements that don't. */
export function partition<const ElementType, const FilteredType extends ElementType>(
	iterable: IterableResolvable<ElementType>,
	predicate: (value: ElementType, index: number) => value is FilteredType
): [FilteredType[], Exclude<ElementType, FilteredType>[]];
export function partition<const ElementType>(
	iterable: IterableResolvable<ElementType>,
	predicate: (value: ElementType, index: number) => boolean
): [ElementType[], ElementType[]];

export function partition<const ElementType>(
	iterable: IterableResolvable<ElementType>,
	predicate: (value: ElementType, index: number) => boolean
): [ElementType[], ElementType[]] {
	predicate = assertFunction(predicate);

	const bufferLeft: ElementType[] = [];
	const bufferRight: ElementType[] = [];

	let index = 0;
	for (const value of toIterableIterator(iterable)) {
		if (predicate(value, index++)) {
			bufferLeft.push(value);
		} else {
			bufferRight.push(value);
		}
	}

	return [bufferLeft, bufferRight];
}
