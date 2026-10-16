import { Module } from "../../core/modules/index";
import type { Awaitable } from "../../utilities/index";
import { validateJobOptions, validateRepeat } from "./timing";
import type {
	TaskJobOptions,
	TaskName,
	TaskPayload,
	TaskRunContext,
} from "./types/TaskTypes";

/** A scheduled task that can be run at a specified interval or pattern. @abstract */
export abstract class Task<
	Task extends TaskName = TaskName, //
	Options extends Task.Options = Task.Options,
> extends Module<Options, "tasks"> {
	public static override readonly options?: Task.Options;
	public readonly interval: number | null;
	public readonly pattern: string | null;
	public readonly timezone: string;
	public readonly jobOptions?: TaskJobOptions;

	public constructor(context: Task.Context, options: TaskOptionsBase = {}) {
		super(context, options);
		this.interval = options.interval ?? null;
		this.pattern = options.pattern ?? null;
		this.jobOptions = options.jobOptions;
		this.timezone = options.timezone ?? "UTC";
		if (this.interval !== null || this.pattern !== null)
			validateRepeat({
				...(this.interval !== null ? { interval: this.interval } : {}),
				...(this.pattern !== null
					? { pattern: this.pattern, timezone: this.timezone }
					: {}),
			});
		if (this.jobOptions) {
			for (const key of Object.keys(this.jobOptions))
				if (
					![
						"jobId",
						"attempts",
						"retryDelay",
						"removeOnComplete",
						"removeOnFail",
					].includes(key)
				)
					throw new TypeError(`Unsupported task job option "${key}".`);
			validateJobOptions(this.jobOptions);
		}
	}

	public abstract run(
		payload: TaskPayload<Task>,
		context?: TaskRunContext,
	): Awaitable<unknown>;
}

/** Options for configuring a scheduled task. */
export interface TaskOptionsBase extends Module.Options {
	/** The interval (in milliseconds) at which the task should run. */
	interval?: number | null;
	/** A cron pattern specifying when the task should run. */
	pattern?: string | null;
	/** Custom options to pass to the job scheduler. */
	jobOptions?: TaskJobOptions;

	/** The timezone to use for the task.
	 * @default 'UTC' */
	timezone?: string | null;
}

/** Custom options for a job in a scheduled task. */
export type ScheduledTaskCustomJobOptions = TaskJobOptions;

/** The namespace for {@link Task}. */
export namespace Task {
	/** The options for a {@link Task}. */
	export type Options = TaskOptionsBase;
	export type Context = Module.Context<"tasks">;
	export type JSON = Module.JSON;
	export type LocationJSON = Module.LocationJSON;
}
