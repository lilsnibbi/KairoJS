import type { IterableResolvable } from "./from";
import { assertPositive } from "./shared/_assertPositive";
import { toIntegerOrThrow } from "./shared/_toIntegerOrThrow";
import { toIterableIterator } from "./toIterableIterator";

/** Chunks the iterable into arrays of at most `size` elements. */
export function* chunk<const ElementType>(
	iterable: IterableResolvable<ElementType>,
	size: number,
): IterableIterator<ElementType[]> {
	size = assertPositive(toIntegerOrThrow(size), size);

	let buffer: ElementType[] = [];
	for (const element of toIterableIterator(iterable)) {
		buffer.push(element);

		if (buffer.length === size) {
			yield buffer;
			buffer = [];
		}
	}

	if (buffer.length) {
		yield buffer;
	}
}
