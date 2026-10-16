import { ModuleStore } from "../../core/modules/index";
import { Task } from "./Task";

/** A store for managing scheduled tasks. */
export class TaskStore extends ModuleStore<Task, "tasks"> {
	public readonly repeatedTasks: Task[] = [];

	public constructor() {
		super(Task, { name: "tasks" });
	}

	public override set(key: string, value: Task): this {
		if (value.interval !== null || value.pattern !== null) {
			this.repeatedTasks.push(value);
		}

		return super.set(key, value);
	}

	public override delete(key: string): boolean {
		const index = this.repeatedTasks.findIndex((task) => task.name === key);

		// If the scheduled task was found, remove it
		if (index !== -1) this.repeatedTasks.splice(index, 1);

		return super.delete(key);
	}

	public override clear(): void {
		this.repeatedTasks.length = 0;
		super.clear();
	}
}
