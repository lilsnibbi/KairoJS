import { filter } from './filter';
import { first } from './first';
import type { IterableResolvable } from './from';

/** Advances the iterable until it finds the element, returning it if it's found and `undefined` otherwise. */
export function find<const ElementType, const FilteredType extends ElementType>(
	iterable: IterableResolvable<ElementType>,
	callbackFn: (element: ElementType, index: number) => element is FilteredType
): FilteredType | undefined;
export function find<const ElementType>(
	iterable: IterableResolvable<ElementType>,
	callbackFn: (element: ElementType, index: number) => boolean
): ElementType | undefined;
export function find<const ElementType>(
	iterable: IterableResolvable<ElementType>,
	callbackFn: (element: ElementType, index: number) => boolean
): ElementType | undefined {
	return first(filter(iterable, callbackFn));
}
