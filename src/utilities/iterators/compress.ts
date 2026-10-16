import { from, type IterableResolvable } from "./from";
import { toIterableIterator } from "./toIterableIterator";

/** Create a new iterable of the first iterable based on the truthiness of the corresponding element in the second iterable. */
export function* compress<const ElementType>(
	iterable: IterableResolvable<ElementType>,
	selectors: IterableResolvable<boolean>,
): IterableIterator<ElementType> {
	const resolvedSelectors = from(selectors);
	for (const resolvedIterableResult of toIterableIterator(iterable)) {
		const selectorResult = resolvedSelectors.next();
		if (selectorResult.done) {
			return;
		}

		if (selectorResult.value) {
			yield resolvedIterableResult;
		}
	}
}
