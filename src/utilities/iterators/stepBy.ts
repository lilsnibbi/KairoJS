import { from, type IterableResolvable } from './from';
import { assertPositive } from './shared/_assertPositive';
import { makeIterableIterator } from './shared/_makeIterableIterator';
import { toIntegerOrInfinityOrThrow } from './shared/_toIntegerOrInfinityOrThrow';

/** Create an iterator starting at the same point, but stepping by the given amount at each iteration. */
export function stepBy<const ElementType>(iterable: IterableResolvable<ElementType>, step: number): IterableIterator<ElementType> {
	step = assertPositive(toIntegerOrInfinityOrThrow(step), step);

	const iterator = from(iterable);
	return makeIterableIterator<ElementType>(() => {
		const result = iterator.next();
		if (result.done) {
			return { done: true, value: undefined };
		}

		for (let i = 0; i < step - 1; i++) {
			const result = iterator.next();
			if (result.done) break;
		}

		return { done: false, value: result.value };
	});
}
