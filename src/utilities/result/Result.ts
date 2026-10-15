import { type Awaitable, type If, isFunction, returnThis } from './common/utils';
import { type None, none, type Option, type Some, some } from './Option';
import { ResultError } from './ResultError';

const ValueProperty = Symbol.for('kairojs/result:Result.value');
const SuccessProperty = Symbol.for('kairojs/result:Result.success');
const UnwrapSafeProperty = Symbol.for('kairojs/result:Result.safeUnwrap');

/** A type used to express computations that can fail, it can be used for returning and propagating errors. */
export class Result<T, E, const Success extends boolean = boolean> {
	/** Branded value to ensure `Success` is typed correctly.
	 * @internal */
	declare protected __STATUS__: Success;

	private readonly [ValueProperty]: If<Success, T, E>;
	private readonly [SuccessProperty]: Success;

	private constructor(value: If<Success, T, E>, success: Success) {
		this[ValueProperty] = value;
		this[SuccessProperty] = success;
	}

	/** Return `true` if the result is `Ok`. */
	public isOk(): this is Ok<T, E> {
		return this[SuccessProperty];
	}

	/** Return `true` if the result is `Ok` and the value inside of it matches a predicate. */
	public isOkAnd<R extends T>(cb: (value: T) => value is R): this is Ok<R, E>;
	public isOkAnd<R extends boolean>(cb: (value: T) => R): this is Ok<T, E> & R;
	public isOkAnd<R extends boolean>(cb: (value: T) => R): this is Ok<T, E> & R {
		return this.isOk() && cb(this[ValueProperty]);
	}

	/** Return `true` if the result is `Err`. */
	public isErr(): this is Err<E, T> {
		return !this[SuccessProperty];
	}

	/** Return `true` if the result is `Err` and the value inside of it matches a predicate. */
	public isErrAnd<R extends E>(cb: (error: E) => error is R): this is Err<R, T>;
	public isErrAnd<R extends boolean>(cb: (error: E) => R): this is Err<E, T> & R;
	public isErrAnd<R extends boolean>(cb: (error: E) => R): this is Err<E, T> & R {
		return this.isErr() && cb(this[ValueProperty]);
	}

	/** Convert from `Result<T, E>` to `Option<T>`.  Converts itself into an `Option<T>`, and discarding the error, if any. */
	public ok(): If<Success, Some<T>, None> {
		return this.match({ ok: (value) => some(value), err: () => none });
	}

	/** Convert from `Result<T, E>` to `Option<E>`.  Converts itself into an `Option<E>`, and discarding the successful value, if any. */
	public err(): If<Success, None, Some<E>> {
		return this.match({ ok: () => none, err: (error) => some(error) });
	}

	/** Maps a `Result<T, E>` to `Result<U, E>` by applying a function to a contained `Ok` value, leaving an `Err` value untouched. */
	public map<OutputValue>(cb: (value: If<Success, T, never>) => OutputValue): Result<OutputValue, E, Success> {
		// @ts-expect-error Complex types
		return this.match({ ok: (value) => ok(cb(value)), err: returnThis });
	}

	/** Map a success to another Result without wrapping it again. Keep errors unchanged. */
	public mapInto<OutputResult extends AnyResult>(cb: (value: If<Success, T, never>) => OutputResult): If<Success, OutputResult, Err<E>> {
		return this.match({ ok: (value) => cb(value), err: returnThis });
	}

	/** Map the success value, or use the default for an error. Use mapOrElse for a lazy fallback. */
	public mapOr<MappedOutputValue, DefaultOutputValue>(
		defaultValue: DefaultOutputValue,
		cb: (value: If<Success, T, never>) => MappedOutputValue
	): If<Success, MappedOutputValue, DefaultOutputValue> {
		return this.match({ ok: (value) => cb(value), err: () => defaultValue });
	}

	/** Map success and error values with separate callbacks. */
	public mapOrElse<OutputValue, OutputError>(
		op: (error: If<Success, never, E>) => OutputError,
		cb: (value: If<Success, T, never>) => OutputValue
	): If<Success, OutputValue, OutputError> {
		return this.match({ ok: (value) => cb(value), err: (error) => op(error) });
	}

	/** Maps a `Result<T, E>` to `Result<T, F>` by applying a function to a contained `Err` value, leaving an `Ok` value untouched.  This function can be used to pass through a successful result while handling an error. */
	public mapErr<OutputError>(cb: (error: If<Success, never, E>) => OutputError): Result<T, OutputError, Success> {
		// @ts-expect-error Complex types
		return this.match({ ok: returnThis, err: (error) => err(cb(error)) });
	}

	/** Maps a `Result<T, E>` to `Result<T, F>` by applying a function to a contained `Err` value, leaving an `Ok` value untouched. */
	public mapErrInto<OutputResult extends AnyResult>(cb: (error: If<Success, never, E>) => OutputResult): If<Success, Ok<T>, OutputResult> {
		return this.match({ ok: returnThis, err: (error) => cb(error) });
	}

	/** Calls the provided closure with a reference to the contained value (if `Ok`). */
	public inspect(cb: (value: T) => unknown): this {
		if (this.isOk()) cb(this[ValueProperty]);
		return this;
	}

	/** Calls the provided closure with a reference to the contained value (if `Ok`) and awaits it. */
	public async inspectAsync(cb: (value: T) => Awaitable<unknown>): Promise<this> {
		if (this.isOk()) await cb(this[ValueProperty]);
		return this;
	}

	/** Calls the provided closure with a reference to the contained error (if `Err`). */
	public inspectErr(cb: (error: E) => unknown): this {
		if (this.isErr()) cb(this[ValueProperty]);
		return this;
	}

	/** Calls the provided closure with a reference to the contained error (if `Err`) and awaits it. */
	public async inspectErrAsync(cb: (error: E) => Awaitable<unknown>): Promise<this> {
		if (this.isErr()) await cb(this[ValueProperty]);
		return this;
	}

	/** Return an iterator over the possibly contained value.  The iterator yields one value if the result is `Ok`, otherwise none. */
	public *iter(): Generator<T> {
		if (this.isOk()) yield this[ValueProperty];
	}

	/** Return the contained `Ok` value.  If the value is an `Err`, it throws a {@link ResultError} with the given message and the content of the `Err`. */
	public expect(message: string): If<Success, T, never> {
		if (this.isErr()) throw new ResultError(message, this[ValueProperty]);
		return this[ValueProperty] as If<Success, T, never>;
	}

	/** Return the contained `Err` value.  If the value is an `Ok`, it throws a {@link ResultError} with the given message and the content of the `Ok`. */
	public expectErr(message: string): If<Success, never, E> {
		if (this.isOk()) throw new ResultError(message, this[ValueProperty]);
		return this[ValueProperty] as If<Success, never, E>;
	}

	/** Return the contained `Ok` value. */
	public unwrap(): If<Success, T, never> {
		if (this.isErr()) throw new ResultError('Unwrap failed', this[ValueProperty]);
		return this[ValueProperty] as If<Success, T, never>;
	}

	/** Return the contained `Err` value. */
	public unwrapErr(): If<Success, never, E> {
		if (this.isOk()) throw new ResultError('Unwrap failed', this[ValueProperty]);
		return this[ValueProperty] as If<Success, never, E>;
	}

	/** Return the contained `Ok` value or the provided default. */
	public unwrapOr<OutputValue>(defaultValue: OutputValue): If<Success, T, OutputValue> {
		return this.match({ ok: (value) => value, err: () => defaultValue });
	}

	/** Return the contained `Ok` value or computes it from a closure. @seealso {@link unwrap} @seealso {@link unwrapOr} @seealso {@link unwrapErr} @seealso {@link unwrapRaw} @seealso {@link unwrapSafe} */
	public unwrapOrElse<OutputValue>(op: (error: E) => OutputValue): If<Success, T, OutputValue> {
		return this.match({ ok: (value) => value, err: (error) => op(error) });
	}

	/** Return the contained `Ok` value.  If the value is an `Err`, it throws the contained error. @seealso {@link unwrap} @seealso {@link unwrapOr} @seealso {@link unwrapOrElse} @seealso {@link unwrapErr} @seealso {@link unwrapSafe} */
	public unwrapRaw(): If<Success, T, never> {
		if (this.isErr()) throw this[ValueProperty];
		// @ts-expect-error Complex types
		return this[ValueProperty] as T;
	}

	/** Return the contained `Ok` value or yelds the contained `Err` value. */
	public *unwrapSafe(): Generator<Err<E, T>, T> {
		if (this.isOk()) {
			return this[ValueProperty];
		}

		yield this as Err<E, T>;
		throw new ResultError('Should not be used outside of a safe try generator', this[ValueProperty]);
	}

	/** Return `result` if the result is `Ok`, otherwise returns the `Err` value of itself. */
	public and<OutputResult extends AnyResult>(result: OutputResult): If<Success, OutputResult, Err<E>> {
		return this.match({ ok: () => result, err: returnThis });
	}

	/** Calls `cb` if the result is `Ok`, otherwise returns the `Err` value of self.  This function can be used for control flow based on `Result` values. */
	public andThen<OutputResult extends AnyResult>(cb: (value: T) => OutputResult): OutputResult {
		// @ts-expect-error Complex types
		return this.match({ ok: (value) => cb(value), err: returnThis });
	}

	/** Use the fallback Result on error. Use orElse to create the fallback lazily. */
	public or<OutputResult extends AnyResult>(result: OutputResult): If<Success, Ok<T>, OutputResult> {
		return this.match({ ok: returnThis, err: () => result });
	}

	/** Calls `cb` if the result is `Err`, otherwise returns the `Ok` value of self.  This function can be used for control flow based on result values. */
	public orElse<OutputResult extends AnyResult>(cb: (error: E) => OutputResult): If<Success, Ok<T>, OutputResult> {
		return this.match({ ok: returnThis, err: (error) => cb(error) });
	}

	/** Return `true` if the result is an `Ok` and the given value strict equals it. */
	public contains<const Value extends T>(this: Ok<T>, value: Value): this is Ok<Value>;
	public contains(this: Err<E>, value: T): false;
	public contains(value: T): boolean {
		return this.isOkAnd((inner) => inner === value);
	}

	/** Return `true` if the result is an `Err` and the given error strict equals it. */
	public containsErr(this: Ok<T>, error: E): false;
	public containsErr<const Value extends E>(this: Err<E>, error: Value): this is Err<Value>;
	public containsErr(error: E): boolean {
		return this.isErrAnd((inner) => inner === error);
	}

	/** Transposes a `Result` of an `Option` into an `Option` of a `Result`.  `ok(none)` will be mapped to `none`. `ok(some(v))` and `err(e)` will be mapped to `some(ok(v))` and `some(err(e))`. */
	public transpose<InnerValue>(this: Result<Option<InnerValue>, E, Success>): If<Success, Option<Ok<InnerValue>>, Some<Err<E>>> {
		return this.match({
			ok: (value) => value.map((value) => ok(value)),
			err() {
				return some(this);
			}
		});
	}

	/** Convert from `Result<Result<T, E>, E>` to `Result<T, E>`. */
	public flatten<InnerResult extends AnyResult>(this: Result<InnerResult, E, Success>): If<Success, InnerResult, Err<E>> {
		return this.match({ ok: (value) => value, err: returnThis });
	}

	/** Return the `Ok` value if self is `Ok`, and the `Err` value if self is `Err`. */
	public intoOkOrErr(): If<Success, T, E> {
		return this[ValueProperty];
	}

	/** Return a `Promise` object with the awaited value (if `Ok`) or the awaited error (if `Err`). */
	public intoPromise(): Promise<If<Success, Ok<Awaited<T>>, Err<Awaited<E>>>> {
		// @ts-expect-error Complex types
		return this.match<Ok<Awaited<T>>, Err<Awaited<E>>>({
			// @ts-expect-error Complex types
			ok: async (value) => ok(await value), // NOSONAR
			// @ts-expect-error Complex types
			err: async (error) => err(await error) // NOSONAR
		});
	}

	/** Check whether `other` equals with self. */
	public eq<OtherValue extends T, OtherError extends E, OtherSuccess extends boolean>(
		other: Result<OtherValue, OtherError, OtherSuccess>
	): this is Result<OtherValue, OtherError, OtherSuccess> {
		// @ts-expect-error Complex types
		return this.isOk() === other.isOk() && this[ValueProperty] === other[ValueProperty];
	}

	/** Check whether `other` doesn't equal with self. */
	public ne(other: Result<T, E>): boolean {
		return !this.eq(other);
	}

	/** Runs `ok` function if self is `Ok`, otherwise runs `err` function. */
	public match<OkValue, ErrValue>(branches: {
		ok(this: Ok<T>, value: If<Success, T, never>): OkValue;
		err(this: Err<E>, error: If<Success, never, E>): ErrValue;
	}): If<Success, OkValue, ErrValue> {
		// @ts-expect-error Complex types
		return this.isOk() ? branches.ok.call(this, this[ValueProperty]) : branches.err.call(this, this[ValueProperty] as E);
	}

	/** Return an iterator over the possibly contained value.  The iterator yields one value if the result is `Ok`, otherwise none. */
	public [Symbol.iterator](): Generator<T> {
		return this.iter();
	}

	public get [Symbol.toStringTag](): If<Success, 'Ok', 'Err'> {
		return this.match({ ok: () => 'Ok', err: () => 'Err' });
	}

	/** This function, in combination with `[$]`, is intended to emulate Rust's ? operator. */
	public get [UnwrapSafeProperty](): Generator<Err<E, T>, T> {
		return this.unwrapSafe();
	}

	public static ok<T = undefined, E = any>(this: void, value?: T): Ok<T, E>;
	public static ok<T, E = any>(this: void, value: T): Ok<T, E> {
		return new Result<T, E, true>(value, true);
	}

	public static err<E = undefined, T = any>(this: void, value?: E): Err<E, T>;
	public static err<E, T = any>(this: void, value: E): Err<E, T> {
		return new Result<T, E, false>(value, false);
	}

	/** Recognize a Result, including compatible instances from another copy of the library. */
	public static [Symbol.hasInstance](instance: unknown): boolean {
		return typeof instance === 'object' && instance !== null && ValueProperty in instance && SuccessProperty in instance;
	}

	/** Recognize a Result, including compatible instances from another copy of the library.
	 * @deprecated Use {@link Result.isResult} instead. */
	public static is(instance: unknown): instance is AnyResult {
		return Result[Symbol.hasInstance](instance);
	}

	/** Recognize a Result, including compatible instances from another copy of the library. */
	public static isResult(instance: unknown): instance is AnyResult {
		return Result[Symbol.hasInstance](instance);
	}

	/** Create a {@link Result} out of a callback.    */
	public static from<T, E = unknown>(this: void, op: ResultResolvable<T, E> | (() => ResultResolvable<T, E>)): Result<T, E> {
		try {
			return resolve(isFunction(op) ? op() : op);
		} catch (error) {
			return err(error as E);
		}
	}

	/** Create a {@link Result} out of a promise or async callback.    */
	public static async fromAsync<T, E = unknown>(
		this: void,
		op: Awaitable<ResultResolvable<T, E>> | (() => Awaitable<ResultResolvable<T, E>>)
	): Promise<Result<T, E>> {
		try {
			return resolve(await (isFunction(op) ? op() : op));
		} catch (error) {
			return err(error as E);
		}
	}

	/** Create an {@link Ok} that is the combination of all collected {@link Ok} values as an array, or the first {@link Err} encountered. */
	public static all<const Entries extends readonly AnyResult[]>(
		this: void,
		results: Entries
	): Result<UnwrapOkArray<Entries>, UnwrapErrArray<Entries>[number]> {
		const values: unknown[] = [];
		for (const result of results) {
			if (result.isErr()) return result;

			values.push(result[ValueProperty]);
		}

		return ok(values as UnwrapOkArray<Entries>);
	}

	/** Return the first encountered {@link Ok}, or an {@link Err} that is the combination of all collected error values. */
	public static any<const Entries extends readonly AnyResult[]>(
		this: void,
		results: Entries
	): Result<UnwrapOk<Entries[number]>, UnwrapErrArray<Entries>> {
		const errors: unknown[] = [];
		for (const result of results) {
			if (result.isOk()) return result;

			errors.push(result[ValueProperty]);
		}

		return err(errors as UnwrapErrArray<Entries>);
	}

	/** Evaluates the given generator to a Result returned or an Err yielded from it, whichever comes first.  This function, in combination with `[$]`, is intended to emulate Rust's ? operator. */
	public static safeTry<T, E>(body: (options: SafeTryOptions) => Generator<Err<E>, Result<T, E>>): Result<T, E>;

	/** Evaluates the given generator to a Result returned or an Err yielded from it, whichever comes first.  This function, in combination with `[$]`, is intended to emulate Rust's ? operator. */
	public static safeTry<T, E>(body: (options: SafeTryOptions) => AsyncGenerator<Err<E>, Result<T, E>>): Promise<Result<T, E>>;
	public static safeTry<T, E>(
		body:
			| ((options: SafeTryOptions) => Generator<Err<E>, Result<T, E>>)
			| ((options: SafeTryOptions) => AsyncGenerator<Err<E>, Result<T, E>>)
	): Result<T, E> | Promise<Result<T, E>> {
		const n = body({ $: UnwrapSafeProperty, $async: unwrapSafeAsync }).next();
		if (n instanceof Promise) {
			return n.then((r) => r.value);
		}

		return n.value;
	}
}

export namespace Result {
	export type Ok<T, E = any> = Result<T, E, true>;
	export type Err<E, T = any> = Result<T, E, false>;
	export type Any = Result<any, any>;
	export type Resolvable<T, E = any, Success extends boolean = boolean> = T | Result<T, E, Success>;
	export type UnwrapOk<T extends AnyResult> = T extends Ok<infer S> ? S : never;
	export type UnwrapErr<T extends AnyResult> = T extends Err<infer S> ? S : never;

	export type UnwrapOkArray<T extends readonly AnyResult[] | []> = {
		-readonly [P in keyof T]: UnwrapOk<T[P]>;
	};
	export type UnwrapErrArray<T extends readonly AnyResult[] | []> = {
		-readonly [P in keyof T]: UnwrapErr<T[P]>;
	};
}

export const { ok, err } = Result;

function resolve<T, E>(value: Result.Resolvable<T, E>): Result<T, E> {
	return Result.isResult(value) ? value : ok(value);
}

async function* unwrapSafeAsync<T, E>(result: Promise<Result<T, E>>): AsyncGenerator<Err<E>, T> {
	const _result = await result;
	return yield* _result.unwrapSafe();
}

export type ResultResolvable<T, E = any, Success extends boolean = boolean> = Result.Resolvable<T, E, Success>;

export type Ok<T, E = any> = Result.Ok<T, E>;
export type Err<E, T = any> = Result.Err<E, T>;
export type AnyResult = Result.Any;

export type UnwrapOk<T extends AnyResult> = Result.UnwrapOk<T>;
export type UnwrapErr<T extends AnyResult> = Result.UnwrapErr<T>;

export type UnwrapOkArray<T extends readonly AnyResult[] | []> = Result.UnwrapOkArray<T>;
export type UnwrapErrArray<T extends readonly AnyResult[] | []> = Result.UnwrapErrArray<T>;

export interface SafeTryOptions {
	$: typeof UnwrapSafeProperty;
	$async: <T, E>(result: Promise<Result<T, E>>) => AsyncGenerator<Err<E>, T>;
}
