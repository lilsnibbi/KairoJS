import type { IterableResolvable } from './from';
import { makeIterableIterator } from './shared/_makeIterableIterator';
import { toIterableIterator } from './toIterableIterator';

/** Create an iterator which ends after the first `done` result from the original iterator. */
export function fuse<const ElementType>(iterable: IterableResolvable<ElementType>): IterableIterator<ElementType> {
	let ended = false;
	const iterator = toIterableIterator(iterable);
	return makeIterableIterator(() => {
		if (ended) {
			return { done: true, value: undefined };
		}

		const result = iterator.next();
		if (result.done) {
			ended = true;
		}

		return result;
	});
}
