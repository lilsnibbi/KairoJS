import { type IterableResolvable } from "./from";
import { assertFunction } from "./shared/_assertFunction";
import { toIterableIterator } from "./toIterableIterator";

/** Create an iterable with the results of calling a provided function on each element of the input iterables as the function's parameters. */
export function* starMap<
	const ElementType extends IterableResolvable<any>,
	const MappedType,
>(
	iterable: IterableResolvable<ElementType>,
	callbackFn: (...args: StarMapParameters<ElementType>) => MappedType,
): IterableIterator<MappedType> {
	callbackFn = assertFunction(callbackFn);

	for (const value of toIterableIterator(iterable)) {
		yield callbackFn(...(toIterableIterator(value) as any));
	}
}

export type StarMapParameters<ElementType> = ElementType extends readonly [
	...infer ElementTypeEntry,
]
	? ElementTypeEntry
	: ElementType extends IterableResolvable<infer ElementType>
		? ElementType[]
		: never;
