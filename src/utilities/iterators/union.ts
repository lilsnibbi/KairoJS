import type { IterableResolvable } from './from';
import { toIterableIterator } from './toIterableIterator';

/** Create an iterable with the elements that are in either input iterable. */
export function* union<const ElementType>(...iterables: IterableResolvable<ElementType>[]): IterableIterator<ElementType> {
	const seen = new Set<ElementType>();
	for (const iterator of iterables) {
		for (const value of toIterableIterator(iterator)) {
			if (!seen.has(value)) {
				seen.add(value);
				yield value;
			}
		}
	}
}
