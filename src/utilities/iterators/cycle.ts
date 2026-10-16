import type { IterableResolvable } from "./from";
import { toIterableIterator } from "./toIterableIterator";

/** Create an infinite iterable by cycling through the elements of the input iterable. */
export function* cycle<const ElementType>(
	iterable: IterableResolvable<ElementType>,
): IterableIterator<ElementType> {
	const results = [] as ElementType[];
	for (const element of toIterableIterator(iterable)) {
		yield element;
		results.push(element);
	}

	while (results.length > 0) {
		for (const element of results) {
			yield element;
		}
	}
}
