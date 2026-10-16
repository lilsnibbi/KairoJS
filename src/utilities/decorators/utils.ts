/** The function precondition interface. */
export type FunctionPrecondition = (
	...args: any[]
) => boolean | Promise<boolean>;

/** The fallback interface, this is called when the function precondition returns or resolves with a falsy value. */
export type FunctionFallback = (...args: any[]) => unknown;

/** Service to make a method decorator with lighter syntax and inferred types. */
export function createMethodDecorator(fn: MethodDecorator): MethodDecorator {
	return fn;
}

/** Service to make a class decorator with lighter syntax and inferred types. */
export function createClassDecorator<
	TFunction extends (...args: any[]) => void,
>(fn: TFunction): ClassDecorator {
	return fn;
}

/** Service to make function preconditions. */
export function createFunctionPrecondition(
	precondition: FunctionPrecondition,
	fallback: FunctionFallback = (): void => undefined,
): MethodDecorator {
	return createMethodDecorator((_target, _propertyKey, descriptor) => {
		const method = descriptor.value;
		if (!method) throw new Error("Function preconditions require a [[value]].");
		if (typeof method !== "function")
			throw new Error(
				"Function preconditions can only be applied to functions.",
			);

		descriptor.value = async function descriptorValue(
			this: (...args: any[]) => any,
			...args: any[]
		) {
			const canRun = await precondition(...args);
			return canRun ? method.call(this, ...args) : fallback.call(this, ...args);
		} as unknown as undefined;
	});
}

/** Create a new proxy to efficiently add properties to class without creating subclasses */
export function createProxy<T extends object>(
	target: T,
	handler: Omit<ProxyHandler<T>, "get">,
): T {
	return new Proxy(target, {
		...handler,
		get: (target, property) => {
			const value = Reflect.get(target, property);
			return typeof value === "function"
				? (...args: readonly unknown[]) => value.apply(target, args)
				: value;
		},
	});
}
