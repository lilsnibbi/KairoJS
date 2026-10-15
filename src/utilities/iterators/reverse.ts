import { collect } from './collect';
import type { IterableResolvable } from './from';

/** Consumes the iterable and returns a new iterable with the elements in reverse order. */
export function* reverse<const ElementType>(iterable: IterableResolvable<ElementType>): IterableIterator<ElementType> {
	const items = collect(iterable);
	for (let i = items.length - 1; i >= 0; i--) {
		yield items[i];
	}
}
