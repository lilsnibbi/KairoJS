import { from, type IterableResolvable } from "./from";

/** Create an iterator that allows you to peek at the next element without advancing the iterator.  @template ElementType The type of elements in the iterable. */
export function peekable<const ElementType>(
	iterable: IterableResolvable<ElementType>,
): Peekable<ElementType> {
	const resolvedIterable = from(iterable);
	let peeked: IteratorResult<ElementType> | undefined;
	return {
		next() {
			if (peeked) {
				const value = peeked;
				peeked = undefined;
				return value;
			}

			return resolvedIterable.next();
		},
		peek() {
			return (peeked ??= resolvedIterable.next());
		},
		[Symbol.iterator]() {
			return this as IterableIterator<ElementType>;
		},
	};
}

export interface Peekable<T> extends IterableIterator<T> {
	peek(): IteratorResult<T>;
}
