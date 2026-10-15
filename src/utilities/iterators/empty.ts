import { makeIterableIterator } from './shared/_makeIterableIterator';

/** Create an empty iterator. */
export function empty<const ElementType = never>(): IterableIterator<ElementType> {
	return makeIterableIterator<ElementType>(() => ({ done: true, value: undefined }));
}
