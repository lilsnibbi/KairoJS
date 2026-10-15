/** Verify if the input is a function. */
export function isFunction(input: unknown): input is Function {
	return typeof input === 'function';
}
