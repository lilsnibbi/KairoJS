const IncrementSymbol = Symbol("kairojs/snowflake.increment");
const EpochSymbol = Symbol("kairojs/snowflake.epoch");
const EpochNumberSymbol = Symbol("kairojs/snowflake.epoch.number");
const ProcessIdSymbol = Symbol("kairojs/snowflake.processId");
const WorkerIdSymbol = Symbol("kairojs/snowflake.workerId");

/** The maximum value the `workerId` field accepts in snowflakes. */
export const MaximumWorkerId = 0b11111n;

/** The maximum value the `processId` field accepts in snowflakes. */
export const MaximumProcessId = 0b11111n;

/** The maximum value the `increment` field accepts in snowflakes. */
export const MaximumIncrement = 0b111111111111n;

const TimestampFieldDivisor = 2 ** 22;

/** A class for generating and deconstructing Twitter snowflakes. */
export class Snowflake {
	/** Alias for {@link deconstruct} */
	public decode = this.deconstruct;

	/** Internal reference of the epoch passed in the constructor
	 * @internal */
	private readonly [EpochSymbol]: bigint;

	/** Internal reference of the epoch passed in the constructor as a number
	 * @internal */
	private readonly [EpochNumberSymbol]: number;

	/** Internal incrementor for generating snowflakes
	 * @internal */
	private [IncrementSymbol] = 0n;

	/** The process ID that will be used by default in the generate method
	 * @internal */
	private [ProcessIdSymbol] = 1n;

	/** The worker ID that will be used by default in the generate method
	 * @internal */
	private [WorkerIdSymbol] = 0n;

	public constructor(epoch: number | bigint | Date) {
		this[EpochSymbol] = BigInt(epoch instanceof Date ? epoch.getTime() : epoch);
		this[EpochNumberSymbol] = Number(this[EpochSymbol]);
	}

	/** The epoch for this snowflake, as a bigint */
	public get epoch(): bigint {
		return this[EpochSymbol];
	}

	/** The epoch for this snowflake, as a number */
	public get epochNumber(): number {
		return this[EpochNumberSymbol];
	}

	/** Get the configured process ID */
	public get processId(): bigint {
		return this[ProcessIdSymbol];
	}

	/** Set the process ID that will be used by default for the {@link generate} method */
	public set processId(value: number | bigint) {
		this[ProcessIdSymbol] = BigInt(value) & MaximumProcessId;
	}

	/** Get the configured worker ID */
	public get workerId(): bigint {
		return this[WorkerIdSymbol];
	}

	/** Set the worker ID that will be used by default for the {@link generate} method */
	public set workerId(value: number | bigint) {
		this[WorkerIdSymbol] = BigInt(value) & MaximumWorkerId;
	}

	/** Generates a snowflake given an epoch and optionally a timestamp */
	public generate({
		increment,
		timestamp = Date.now(),
		workerId = this[WorkerIdSymbol],
		processId = this[ProcessIdSymbol],
	}: SnowflakeGenerateOptions = {}) {
		if (timestamp instanceof Date) timestamp = BigInt(timestamp.getTime());
		else if (typeof timestamp === "number") timestamp = BigInt(timestamp);
		else if (typeof timestamp !== "bigint") {
			throw new TypeError(
				`"timestamp" argument must be a number, bigint, or Date (received ${typeof timestamp})`,
			);
		}

		if (typeof increment !== "bigint") {
			increment = this[IncrementSymbol];
			this[IncrementSymbol] = (increment + 1n) & MaximumIncrement;
		}

		// timestamp, workerId, processId, increment
		return (
			((timestamp - this[EpochSymbol]) << 22n) |
			((workerId & MaximumWorkerId) << 17n) |
			((processId & MaximumProcessId) << 12n) |
			(increment & MaximumIncrement)
		);
	}

	/** Deconstructs a snowflake given a snowflake ID */
	public deconstruct(id: string | bigint): DeconstructedSnowflake {
		const bigIntId = BigInt(id);
		const epoch = this[EpochSymbol];
		return {
			id: bigIntId,
			timestamp: (bigIntId >> 22n) + epoch,
			workerId: (bigIntId >> 17n) & MaximumWorkerId,
			processId: (bigIntId >> 12n) & MaximumProcessId,
			increment: bigIntId & MaximumIncrement,
			epoch,
		};
	}

	/** Get the timestamp field's value from a snowflake. */
	public timestampFrom(id: string | bigint): number {
		return (
			Math.floor(Number(id) / TimestampFieldDivisor) + this[EpochNumberSymbol]
		);
	}

	/** Return a number indicating whether a reference snowflake comes before, or after, or is same as the given snowflake in sort order. */
	public static compare(a: string | bigint, b: string | bigint): -1 | 0 | 1 {
		const typeA = typeof a;
		return typeA === typeof b
			? typeA === "string"
				? cmpString(a as string, b as string)
				: cmpBigInt(a as bigint, b as bigint)
			: cmpBigInt(BigInt(a), BigInt(b));
	}
}

/** @internal */
function cmpBigInt(a: bigint, b: bigint) {
	return a === b ? 0 : a < b ? -1 : 1;
}

/** @internal */
function cmpString(a: string, b: string) {
	return a === b
		? 0
		: a.length < b.length
			? -1
			: a.length > b.length
				? 1
				: a < b
					? -1
					: 1;
}

/** Options for Snowflake#generate */
export interface SnowflakeGenerateOptions {
	/** Timestamp or date of the snowflake to generate
	 * @default Date.now() */
	timestamp?: number | bigint | Date;

	/** The increment to use
	 * @default 0n */
	increment?: bigint;

	/** The worker ID to use, will be truncated to 5 bits (0-31)
	 * @default 0n */
	workerId?: bigint;

	/** The process ID to use, will be truncated to 5 bits (0-31)
	 * @default 1n */
	processId?: bigint;
}

/** Object returned by Snowflake#deconstruct */
export interface DeconstructedSnowflake {
	/** The id in BigInt form */
	id: bigint;

	/** The timestamp stored in the snowflake */
	timestamp: bigint;

	/** The worker id stored in the snowflake */
	workerId: bigint;

	/** The process id stored in the snowflake */
	processId: bigint;

	/** The increment stored in the snowflake */
	increment: bigint;

	/** The epoch to use in the snowflake */
	epoch: bigint;
}
