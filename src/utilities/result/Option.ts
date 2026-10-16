import {
	type Awaitable,
	type If,
	isFunction,
	returnThis,
} from "./common/utils";
import { OptionError } from "./OptionError";
import { type Err, err, type Ok, ok, Result } from "./Result";

const ValueProperty = Symbol.for("kairojs/result:Option.value");
const ExistsProperty = Symbol.for("kairojs/result:Option.exists");

export class Option<T, Exists extends boolean = boolean> {
	/** Branded value to ensure `Success` is typed correctly.
	 * @internal */
	declare protected __STATUS__: Exists;

	private readonly [ValueProperty]: If<Exists, T, null>;
	private readonly [ExistsProperty]: Exists;

	private constructor(value: If<Exists, T, null>, exists: Exists) {
		this[ValueProperty] = value;
		this[ExistsProperty] = exists;
	}

	/** Return `true` if the option is a `Some` value. */
	public isSome(): this is Some<T> {
		return this[ExistsProperty];
	}

	/** Return `true` if the option is a `Some` and the value inside of it matches a predicate. */
	public isSomeAnd<R extends T>(cb: (value: T) => value is R): this is Some<R>;
	public isSomeAnd<R extends boolean>(cb: (value: T) => R): this is Some<R> & R;
	public isSomeAnd<R extends boolean>(
		cb: (value: T) => R,
	): this is Some<R> & R {
		return this.isSome() && cb(this[ValueProperty]);
	}

	/** Return `true` if the option is a `None` value. */
	public isNone(): this is None {
		return !this[ExistsProperty];
	}

	/** Return `true` if the option is a `None` value or the value inside of it matches a predicate. */
	public isNoneOr<R extends T>(
		cb: (value: T) => value is R,
	): this is None | Some<R>;
	public isNoneOr<R extends boolean>(cb: (value: T) => R): If<Exists, R, true>;
	public isNoneOr<R extends boolean>(cb: (value: T) => R): If<Exists, R, true> {
		return this.match({ some: (value) => cb(value), none: () => true });
	}

	/** Return the contained `Some` value. */
	public expect(message: string): If<Exists, T, never> {
		if (this.isNone()) throw new OptionError(message);
		// @ts-expect-error Complex types
		return this[ValueProperty];
	}

	/** Return the contained `Some` value.  If the value is an `Err`, it throws an {@link OptionError} with the message. @seealso {@link unwrapOr} @seealso {@link unwrapOrElse} */
	public unwrap(): If<Exists, T, never> {
		if (this.isNone()) throw new OptionError("Unwrap failed");
		// @ts-expect-error Complex types
		return this[ValueProperty];
	}

	/** Return the contained `Some` value or a provided default.  Arguments passed to `unwrapOr` are eagerly evaluated; if you are passing the result of a function call, it is recommended to use {@link unwrapOrElse}, which is lazily evaluated. */
	public unwrapOr<OutputValue>(
		defaultValue: OutputValue,
	): If<Exists, T, OutputValue> {
		return this.match({ some: (value) => value, none: () => defaultValue });
	}

	/** Return the contained Some value or computes it from a closure. */
	public unwrapOrElse<OutputValue>(
		cb: () => OutputValue,
	): If<Exists, T, OutputValue> {
		return this.match({ some: (value) => value, none: cb });
	}

	/** Maps an `Option<T>` to `Option<U>` by applying a function to a contained value. */
	public map<U>(cb: (value: T) => U): Option<U, Exists> {
		// @ts-expect-error Complex types
		return this.match({ some: (value) => some(cb(value)), none: returnThis });
	}

	/** Maps a `Some<T>` to the returned `Option<U>` by applying a function to a contained value, leaving `None` untouched. */
	public mapInto<OutputOption extends AnyOption>(
		cb: (value: T) => OutputOption,
	): OutputOption {
		// @ts-expect-error Complex types
		return this.match({ some: (value) => cb(value), none: returnThis });
	}

	/** Return the provided default result (if none), or applies a function to the contained value (if any). */
	public mapOr<MappedOutputValue, DefaultOutputValue>(
		defaultValue: DefaultOutputValue,
		cb: (value: T) => MappedOutputValue,
	): If<Exists, MappedOutputValue, DefaultOutputValue> {
		return this.match({ some: (value) => cb(value), none: () => defaultValue });
	}

	/** Calculate a default function result (if none), or applies a different function to the contained value (if any). */
	public mapOrElse<OutputValue, OutputNone>(
		defaultValue: () => OutputNone,
		cb: (value: T) => OutputValue,
	): If<Exists, OutputValue, OutputNone> {
		return this.match({
			some: (value) => cb(value),
			none: () => defaultValue(),
		});
	}

	/** Maps a `None` to the returned `Option<U>` by applying a function to a contained value, leaving `Some<T>` untouched. */
	public mapNoneInto<OutputOption extends AnyOption>(
		cb: () => OutputOption,
	): If<Exists, Some<T>, OutputOption> {
		return this.match({ some: returnThis, none: cb });
	}

	/** Calls the provided closure with a reference to the contained value (if `Some`). */
	public inspect(cb: (value: T) => void): this {
		if (this.isSome()) cb(this[ValueProperty]);
		return this;
	}

	/** Calls the provided closure with a reference to the contained value (if `Some`). */
	public async inspectAsync(
		cb: (value: T) => Awaitable<unknown>,
	): Promise<this> {
		if (this.isSome()) await cb(this[ValueProperty]);
		return this;
	}

	/** Transforms the `Option<T>` into a `Result<T, E>`, mapping `Some(v)` to `Ok(v)` and `None` to `Err(err)`. */
	public okOr<ErrorValue>(
		error: ErrorValue,
	): If<Exists, Ok<T>, Err<ErrorValue>> {
		return this.match({ some: (value) => ok(value), none: () => err(error) });
	}

	/** Transforms the `Option<T>` into a `Result<T, E>`, mapping `Some(v)` to `Ok(v)` and `None` to `Err(err())`. */
	public okOrElse<ErrorValue>(
		cb: () => ErrorValue,
	): If<Exists, Ok<T>, Err<ErrorValue>> {
		return this.match({ some: (value) => ok(value), none: () => err(cb()) });
	}

	/** Return an iterator over the possibly contained value.  The iterator yields one value if the result is `Some`, otherwise none. */
	public *iter(): Generator<T> {
		if (this.isSome()) yield this[ValueProperty];
	}

	/** Return `None` if the option is `None`, otherwise returns `option`. */
	public and<OutputOption extends AnyOption>(
		option: OutputOption,
	): If<Exists, OutputOption, None> {
		return this.match({ some: () => option, none: returnThis });
	}

	/** Calls `cb` if the result is `Ok`, otherwise returns the `Err` value of self.  This function can be used for control flow based on `Result` values. */
	public andThen<OutputOption extends AnyOption>(
		cb: (value: T) => OutputOption,
	): OutputOption {
		// @ts-expect-error Complex types
		return this.match({ some: (value) => cb(value), none: returnThis });
	}

	/** Return the option if it contains a value, otherwise returns `option`. */
	public or<OutputOption extends AnyOption>(
		option: OutputOption,
	): If<Exists, Some<T>, OutputOption> {
		return this.match({ some: returnThis, none: () => option });
	}

	/** Calls `cb` if the result is `Ok`, otherwise returns the `Err` value of self.  This function can be used for control flow based on `Result` values. */
	public orElse<OutputOption extends AnyOption>(
		cb: () => OutputOption,
	): If<Exists, Some<T>, OutputOption> {
		return this.match({ some: returnThis, none: () => cb() });
	}

	/** Return `Some` if exactly one of self or `option` is `Some`, otherwise returns `None`. */
	public xor<OtherValue, OtherExists extends boolean>(
		option: Option<OtherValue, OtherExists>,
	): If<
		Exists,
		If<OtherExists, None, Some<T>>,
		Option<OtherValue, OtherExists>
	> {
		return this.match<
			If<OtherExists, None, Some<T>>,
			Option<OtherValue, OtherExists>
		>({
			some() {
				return (option.isNone() ? this : none) as If<
					OtherExists,
					None,
					Some<T>
				>;
			},
			none: () => option,
		});
	}

	/** Return None if the option is None, otherwise calls `predicate` with the wrapped value and returns:  - `Some(t)` if `predicate` returns `true` (where t is the wrapped value), and - `None` if `predicate` returns `false`. */
	public filter<R extends T>(predicate: (value: T) => value is R): Option<R>;
	public filter(predicate: (value: T) => boolean): Option<T>;
	public filter(predicate: (value: T) => boolean): Option<T> {
		return this.isSomeAnd(predicate) ? this : none;
	}

	/** Return `true` if the option is a `Some` value containing the given value. */
	public contains<const Value extends T>(
		value: If<Exists, Value, unknown>,
	): this is Some<Value> {
		return this.isSomeAnd((inner) => inner === value);
	}

	/** Zips self with another `Option`.  If self is `Some(s)` and `other` is `Some(o)`, this method returns `Some([s, o])`. Otherwise, `None` is returned. */
	public zip<OtherValue, OtherExists extends boolean>(
		other: Option<OtherValue, OtherExists>,
	): Option<[T, OtherValue], If<Exists, OtherExists, false>> {
		// @ts-expect-error Complex types
		return this.isSome() && other.isSome()
			? some([this[ValueProperty], other[ValueProperty]] as [T, OtherValue])
			: none;
	}

	/** Zips self and another `Option` with function `f`.  If self is `Some(s)` and other is `Some(o)`, this method returns `Some(f(s, o))`. Otherwise, `None` is returned. */
	public zipWith<OtherValue, OtherExists extends boolean, ReturnValue>(
		other: Option<OtherValue, OtherExists>,
		f: (value0: T, value1: OtherValue) => ReturnValue,
	): Option<ReturnValue, If<Exists, OtherExists, false>> {
		// @ts-expect-error Complex types
		return this.isSome() && other.isSome()
			? some(f(this[ValueProperty], other[ValueProperty]))
			: none;
	}

	/** Unzips an option containing a tuple of two options.  If self is `Some([a, b])` this method returns `[Some(a), Some(b)]`. Otherwise, `[None, None]` is returned. */
	public unzip<Value0, Value1, Exists extends boolean>(
		this: Option<readonly [Value0, Value1], Exists>,
	): [Option<Value0, Exists>, Option<Value1, Exists>] {
		// @ts-expect-error Complex types
		return this.match({
			some: ([value0, value1]) => [some(value0), some(value1)],
			none: () => [none, none],
		});
	}

	/** Transposes an `Option` of a `Result` into a `Result` of an `Option`.  `none` will be mapped to `ok(none)`. `some(ok(v))` and `some(err(e))` will be mapped to `ok(some(v))` and `err(e)`. */
	public transpose<
		ResultValue,
		ResultError,
		ResultSuccess extends boolean,
		Exists extends boolean,
	>(
		this: Option<Result<ResultValue, ResultError, ResultSuccess>, Exists>,
	): If<
		Exists,
		Result<Some<ResultValue>, ResultError, ResultSuccess>,
		Ok<None>
	> {
		return this.match<
			Result<Some<ResultValue>, ResultError, ResultSuccess>,
			Ok<None>
		>({
			some: (result) => result.map(some),
			none: () => ok(none),
		});
	}

	/** Convert from `Result<Result<T, E>, E>` to `Result<T, E>`. */
	public flatten<InnerOption extends AnyOption, Exists extends boolean>(
		this: Option<InnerOption, Exists>,
	): If<Exists, InnerOption, None> {
		return this.match({ some: (inner) => inner, none: returnThis });
	}

	/** Return a `Promise` object with the awaited value (if `Some`). */
	public intoPromise(): Promise<Option<Awaited<T>, Exists>> {
		// @ts-expect-error Complex types
		return this.match({
			some: async (value) => some(await value), // NOSONAR
			none: () => Promise.resolve(none),
		});
	}

	/** Check whether `other` equals with self. */
	public eq<OtherValue extends T, OtherExists extends boolean>(
		other: Option<OtherValue, OtherExists>,
	): this is Option<OtherValue, OtherExists> {
		// @ts-expect-error Complex types
		return (
			this.isSome() === other.isSome() &&
			this[ValueProperty] === other[ValueProperty]
		);
	}

	/** Check whether `other` doesn't equal with self. */
	public ne(other: Option<T, boolean>): boolean {
		return !this.eq(other);
	}

	/** Runs `ok` function if self is `Ok`, otherwise runs `err` function. */
	public match<SomeValue, NoneValue>(branches: {
		some(this: Some<T>, value: T): SomeValue;
		none(this: None): NoneValue;
	}): If<Exists, SomeValue, NoneValue> {
		// @ts-expect-error Complex types
		return this.isSome()
			? branches.some.call(this, this[ValueProperty])
			: branches.none.call(this);
	}

	/** Return an iterator over the possibly contained value.  The iterator yields one value if the result is `Some`, otherwise none. */
	public [Symbol.iterator](): Generator<T> {
		return this.iter();
	}

	public get [Symbol.toStringTag](): If<Exists, "Some", "None"> {
		return this.match({ some: () => "Some", none: () => "None" });
	}

	public static readonly none = new Option<any, false>(null, false);

	public static some<T = undefined>(this: void, value?: T): Some<T>;
	public static some<T>(this: void, value: T): Some<T> {
		return new Option<T, true>(value, true);
	}

	/** Recognize an Option, including compatible instances from another copy of the library. */
	public static [Symbol.hasInstance](instance: unknown): boolean {
		return (
			typeof instance === "object" &&
			instance !== null &&
			ValueProperty in instance &&
			ExistsProperty in instance
		);
	}

	/** Recognize an Option, including compatible instances from another copy of the library.
	 * @deprecated Use {@link Option.isOption} instead. */
	public static is(instance: unknown): instance is AnyOption {
		return Option[Symbol.hasInstance](instance);
	}

	/** Recognize an Option, including compatible instances from another copy of the library. */
	public static isOption(instance: unknown): instance is AnyOption {
		return Option[Symbol.hasInstance](instance);
	}

	/** Create a {@link Result} out of a callback.    */
	public static from<T>(
		this: void,
		op: OptionResolvable<T> | (() => OptionResolvable<T>),
	): Option<T> {
		try {
			return resolve(isFunction(op) ? op() : op);
		} catch {
			return none;
		}
	}

	/** Create a {@link Result} out of a promise or async callback.    */
	public static async fromAsync<T>(
		this: void,
		op: Awaitable<OptionResolvable<T>> | (() => Awaitable<OptionResolvable<T>>),
	): Promise<Option<T>> {
		try {
			return resolve(await (isFunction(op) ? op() : op));
		} catch {
			return none;
		}
	}

	/** Create an {@link Ok} that is the combination of all collected {@link Ok} values as an array, or the first {@link Err} encountered. */
	public static all<const Entries extends readonly AnyOption[]>(
		this: void,
		results: Entries,
	): Option<UnwrapSomeArray<Entries>> {
		const values: unknown[] = [];
		for (const result of results) {
			if (result.isNone()) return result;

			values.push(result[ValueProperty]);
		}

		return some(values as UnwrapSomeArray<Entries>);
	}

	/** Return the first encountered {@link Some}, or a {@link None} if none was found. */
	public static any<const Entries extends readonly AnyOption[]>(
		this: void,
		results: Entries,
	): Option<UnwrapSome<Entries[number]>> {
		for (const result of results) {
			if (result.isSome()) return result;
		}

		return none;
	}
}

export namespace Option {
	export type Some<T> = Option<T, true>;
	export type None<T = any> = Option<T, false>;
	export type Any = Option<any>;
	export type Resolvable<T, Exists extends boolean = boolean> =
		T | null | undefined | Option<T, Exists>;
	export type UnwrapSome<T extends AnyOption> =
		T extends Some<infer S> ? S : never;
	export type UnwrapSomeArray<T extends readonly AnyOption[] | []> = {
		-readonly [P in keyof T]: UnwrapSome<T[P]>;
	};
}

export const { some, none } = Option;

function resolve<T>(value: Option.Resolvable<T>): Option<T> {
	if (value === null || value === undefined) return none;
	if (Option.isOption(value)) return value;
	return some(value);
}

export type OptionResolvable<
	T,
	Exists extends boolean = boolean,
> = Option.Resolvable<T, Exists>;

export type Some<T> = Option.Some<T>;
export type None<T = any> = Option.None<T>;
export type AnyOption = Option.Any;

export type UnwrapSome<T extends AnyOption> = Option.UnwrapSome<T>;
export type UnwrapSomeArray<T extends readonly AnyOption[] | []> =
	Option.UnwrapSomeArray<T>;
