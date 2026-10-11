import { isObject } from '../guards/isObject';
import type { DeepRequired } from '../types';
import { deepClone } from './deepClone';

/** Deep merges 2 objects. Properties from the second parameter are applied to the first. */
export function mergeDefault<A extends object, B extends Partial<A>>(base: A, overwrites?: B): DeepRequired<A & B> {
	// If no overwrites are specified then deep clone the base
	if (!overwrites) return deepClone(base) as DeepRequired<A & B>;

	for (const [baseKey, baseValue] of Object.entries(base)) {
		const overwritesValueAtBaseKey = Reflect.get(overwrites, baseKey);

		if (typeof overwritesValueAtBaseKey === 'undefined') {
			Reflect.set(overwrites, baseKey, deepClone(baseValue));
		} else if (isObject(overwritesValueAtBaseKey)) {
			Reflect.set(overwrites, baseKey, mergeDefault((baseValue ?? {}) as object, overwritesValueAtBaseKey));
		}
	}

	return overwrites as DeepRequired<A & B>;
}
