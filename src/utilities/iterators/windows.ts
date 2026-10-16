import { from, type IterableResolvable } from "./from";
import { assertPositive } from "./shared/_assertPositive";
import { makeIterableIterator } from "./shared/_makeIterableIterator";
import { toIntegerOrInfinityOrThrow } from "./shared/_toIntegerOrInfinityOrThrow";

/** Create an iterable with arrays of `count` elements representing a sliding window. */
export function windows<const ElementType>(
	iterable: IterableResolvable<ElementType>,
	count: number,
): IterableIterator<ElementType[]> {
	count = assertPositive(toIntegerOrInfinityOrThrow(count), count);

	const buffer = [] as ElementType[];
	const resolvedIterable = from(iterable);
	return makeIterableIterator<ElementType[]>(() => {
		while (buffer.length !== count) {
			const result = resolvedIterable.next();
			if (result.done) return { done: true, value: undefined };

			buffer.push(result.value);
		}

		const value = buffer.slice();
		buffer.shift();
		return { done: false, value };
	});
}
