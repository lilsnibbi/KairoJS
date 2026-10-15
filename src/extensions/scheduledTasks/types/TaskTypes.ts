/** No URL means process-local, volatile scheduling. */
export interface TaskSchedulerOptions {
	redis_url?: string;
	queue?: string;
	pollInterval?: number;
	concurrency?: number;
	leaseDuration?: number;
	connectionTimeout?: number;
	commandTimeout?: number;
	logErrors?: boolean;
}

export type TaskState = 'waiting' | 'active' | 'completed' | 'failed';
export interface TaskJobOptions {
	/** A stable ID makes creation idempotent within this queue. */
	jobId?: string;
	/** Attempts after thrown errors, including the first. Defaults to one. */
	attempts?: number;
	/** Fixed retry delay in milliseconds. */
	retryDelay?: number;
	removeOnComplete?: boolean;
	removeOnFail?: boolean;
}
export type TaskOptions = TaskJobOptions &
	(
		| { repeated?: false; delay?: number; interval?: never; pattern?: never; timezone?: never }
		| { repeated: true; delay?: never; interval: number; pattern?: never; timezone?: never }
		| { repeated: true; delay?: never; interval?: never; pattern: string; timezone?: string }
	);
export interface TaskRepeat {
	interval?: number;
	pattern?: string;
	timezone?: string;
}

/** A saved snapshot. Use the scheduler to refresh or delete it. */
export interface TaskRecord<Payload = unknown> {
	id: string;
	name: string;
	data: Payload;
	state: TaskState;
	createdAt: number;
	runAt: number;
	scheduledAt: number;
	updatedAt: number;
	attemptsMade: number;
	failures: number;
	options: TaskJobOptions;
	repeat?: TaskRepeat;
	lastError?: string;
	/** Internal ownership fields are exposed for diagnostics only. */
	token?: string;
	leaseUntil?: number;
}
export interface TaskRunContext {
	/** Aborted if another worker takes this lease. Tasks should be idempotent. */
	signal: AbortSignal;
	job: TaskRecord;
}
export interface RepeatedTaskListOptions {
	start?: number;
	end?: number;
	asc?: boolean;
}
export interface TaskListOptions extends RepeatedTaskListOptions {
	types?: TaskState[];
}
export interface TaskCleanupOptions {
	states?: ('completed' | 'failed')[];
	/** Remove records last updated before this Unix timestamp in milliseconds. */
	before?: number;
}
export type RepeatedTaskInfo = TaskRecord[];
export interface RepeatedTask {
	name: TaskNameWithoutPayload;
	options: TaskOptions;
}

/** Augment kairojs with your task names and payloads. */
export interface Tasks {}
export type TaskName = keyof Tasks;
export type TaskNameWithoutPayload = { [K in TaskName]: Tasks[K] extends never ? K : undefined extends Tasks[K] ? K : never }[TaskName];
export type TaskPayload<K extends TaskName = TaskName> = TaskName extends never ? undefined : Tasks[K] extends never ? undefined : Tasks[K];
export interface TaskWithoutPayload<K extends TaskNameWithoutPayload = TaskNameWithoutPayload> {
	name: K;
}
export interface TaskWithPayload<K extends TaskName = TaskName> {
	name: K;
	payload: TaskPayload<K>;
}
export type TaskResolvable = TaskNameWithoutPayload | TaskWithoutPayload | TaskWithPayload;
export type TaskJob<T> = T extends TaskWithPayload<infer R> ? TaskRecord<TaskPayload<R>> : TaskRecord<undefined>;
