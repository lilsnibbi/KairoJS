import type { IterableResolvable } from './from';
import { minBy } from './minBy';
import { defaultCompare } from './shared/comparators';

/** Consumes the iterable and returns the lowest number element. */
export function min<const ElementType>(iterable: IterableResolvable<ElementType>): ElementType | null {
	return minBy(iterable, defaultCompare);
}
