import { from, type IterableResolvable } from './from';

/** Create an iterable with the elements of the input iterables zipped together. The opposite of {@linkcode unzip}. */
export function* zip<const Iterables extends readonly IterableResolvable<any>[]>(...iterables: Iterables): ZipIterators<Iterables> {
	const resolvedIterables = iterables.map((iterable) => from(iterable));
	while (true) {
		const results = [] as any[];
		for (const resolvedIterable of resolvedIterables) {
			const result = resolvedIterable.next();
			if (result.done) return;

			results.push(result.value);
		}

		yield results as any;
	}
}

export type ZipIterators<Iterators extends readonly IterableResolvable<any>[]> = IterableIterator<{
	-readonly [P in keyof Iterators]: Iterators[P] extends IterableResolvable<infer T> ? T : never;
}>;
