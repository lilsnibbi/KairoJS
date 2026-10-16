import type { IterableResolvable } from "./from";
import { toIterableIterator } from "./toIterableIterator";

/** Collects all the items from an iterator into an array. */
export function collectInto<const ElementType>(
	iterable: IterableResolvable<ElementType>,
	output: ElementType[],
): ElementType[] {
	for (const value of toIterableIterator(iterable)) {
		output.push(value);
	}

	return output;
}
