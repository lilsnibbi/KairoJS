import { assertNotNegative } from "./shared/_assertNotNegative";
import { makeIterableIterator } from "./shared/_makeIterableIterator";
import { toNumberOrThrow } from "./shared/_toNumberOrThrow";

/** Create an iterable that repeats the input iterable `count` times. */
export function repeat<const ElementType>(
	value: ElementType,
	count: number,
): IterableIterator<ElementType> {
	count = assertNotNegative(toNumberOrThrow(count), count);

	let i = 0;
	return makeIterableIterator<ElementType>(() => {
		if (i >= count) return { done: true, value: undefined };
		i++;
		return { done: false, value };
	});
}
