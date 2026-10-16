import type { Task } from "../Task";

/** Events emitted during the process setting up the scheduler and running a task. You can use these events to trace the progress for debugging purposes. */
export const TaskEvents = {
	/** Event that is emitted if a task module is not found in the store */
	ScheduledTaskNotFound: "scheduledTaskNotFound" as const,
	/** Event that is emitted before a task's "run" method is called */
	ScheduledTaskRun: "scheduledTaskRun" as const,
	/** Event that is emitted when a task's "run" method throws an error */
	ScheduledTaskError: "scheduledTaskError" as const,
	/** Event that is emitted when a tasks's "run" method is successful */
	ScheduledTaskSuccess: "scheduledTaskSuccess" as const,
	/** Event that is emitted when a task's "run" method finishes, regardless of whether an error occurred or not */
	ScheduledTaskFinished: "scheduledTaskFinished" as const,
	/** A claim or completion could not be saved. The backend will retry. */
	StorageError: "taskStorageError" as const,
};

declare module "discord.js" {
	interface ClientEvents {
		[TaskEvents.ScheduledTaskNotFound]: [
			task: string, //
			payload: unknown,
		];
		[TaskEvents.ScheduledTaskRun]: [
			task: Task, //
			payload: unknown,
		];
		[TaskEvents.ScheduledTaskError]: [
			error: unknown, //
			task: Task,
			payload: unknown,
		];
		[TaskEvents.ScheduledTaskSuccess]: [
			task: Task, //
			payload: unknown,
			result: unknown,
			duration: number,
		];
		[TaskEvents.ScheduledTaskFinished]: [
			task: Task, //
			duration: number | null,
			payload: unknown,
		];
		[TaskEvents.StorageError]: [error: Error];
	}
}
