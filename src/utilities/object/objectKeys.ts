/**
 * Return an object’s own enumerable string keys with its declared key/value types.
 * @param obj - Source object.
 * @returns A new array; symbol keys are excluded.
 */
export function objectKeys<T extends object>(
	obj: T,
): T extends ArrayLike<any> ? `${number}`[] : (keyof T)[] {
	return Object.keys(obj) as T extends ArrayLike<any>
		? `${number}`[]
		: (keyof T)[];
}
