import { from, type IterableResolvable } from './from';
import {
	type CompareByComparator,
	compareIteratorElements,
	type LexicographicComparison,
	orderingIsEqual,
	orderingIsLess
} from './shared/_compare';
import { toIterableIterator } from './toIterableIterator';

/** {@link LexicographicComparison Lexicographically} compares the elements of both iterators are equal. That is: */
export function compareBy<const ElementType>(
	iterable: IterableResolvable<ElementType | undefined>,
	other: IterableResolvable<ElementType | undefined>,
	comparator: CompareByComparator<ElementType>
): LexicographicComparison {
	const iterator1 = from(other);

	for (const x of toIterableIterator(iterable)) {
		const result1 = iterator1.next();
		if (result1.done) return 1;

		const y = result1.value;
		const comparison = compareIteratorElements<ElementType>(x, y, comparator);
		if (!orderingIsEqual(comparison)) {
			return orderingIsLess(comparison) ? -1 : 1;
		}
	}

	return iterator1.next().done ? 0 : -1;
}
