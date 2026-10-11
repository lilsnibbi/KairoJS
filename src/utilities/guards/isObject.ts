import type { Constructor } from '../types';

/** Verify if the input is an object literal (or class). */
export function isObject(input: unknown, constructorType?: ObjectConstructor): input is object;
export function isObject<T extends Constructor<unknown>>(input: unknown, constructorType: T): input is InstanceType<T>;
export function isObject<T extends Constructor<unknown> = ObjectConstructor>(input: unknown, constructorType?: T): input is object {
	return typeof input === 'object' && input ? input.constructor === (constructorType ?? Object) : false;
}
