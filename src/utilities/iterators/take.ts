import { empty } from './empty';
import { from, type IterableResolvable } from './from';
import { assertNotNegative } from './shared/_assertNotNegative';
import { makeIterableIterator } from './shared/_makeIterableIterator';
import { toIntegerOrInfinityOrThrow } from './shared/_toIntegerOrInfinityOrThrow';

/** Create an iterable with the first `count` elements. */
export function take<const ElementType>(iterable: IterableResolvable<ElementType>, count: number): IterableIterator<ElementType> {
	count = assertNotNegative(toIntegerOrInfinityOrThrow(count), count);
	if (count === 0) return empty();

	let i = 0;
	const resolvedIterable = from(iterable);
	return makeIterableIterator<ElementType>(() => {
		if (i >= count) return { done: true, value: undefined };
		i++;
		return resolvedIterable.next();
	});
}
