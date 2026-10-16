import type { KairoClient } from "../../core/client/KairoClient";
import { Extension } from "../../core/lifecycle/Extension";
import { container } from "../../core/modules/index";
import { loadListeners, TaskScheduler, TaskStore } from "./index";
export class TasksExtension extends Extension {
	static override readonly critical = true;
	static override setup(client: KairoClient): void {
		const options = client.options.extensions?.scheduledtasks || {};
		const tasks = new TaskScheduler(options);
		container.tasks = tasks;
		client.addDisposer(() => tasks.close());
		client.modules.register(new TaskStore());
		if (options.logErrors !== false) loadListeners();
	}
	static override async afterLogin(): Promise<void> {
		await container.tasks.createRepeated();
		await container.tasks.start();
	}
}
