import { from, type IterableResolvable } from "./from";

/**
 * Lazily combine corresponding source values into tuples, stopping when any source ends. Earlier sources in a partial
 * final tuple may already have advanced.
 */
export function* zip<
	const Iterables extends readonly IterableResolvable<any>[],
>(...iterables: Iterables): ZipIterators<Iterables> {
	const resolvedIterables = iterables.map((iterable) => from(iterable));
	if (!resolvedIterables.length) return;
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

/** Iterator of tuples containing one value from each supplied source. */
export type ZipIterators<Iterators extends readonly IterableResolvable<any>[]> =
	IterableIterator<{
		-readonly [P in keyof Iterators]: Iterators[P] extends IterableResolvable<
			infer T
		>
			? T
			: never;
	}>;
