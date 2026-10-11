import { writeLog } from '../../../core/logging/diagnostics';
import { Listener } from '../../../events/listener';
import { TaskEvents } from '../types/TaskEvents';

export class NotFoundListener extends Listener<typeof TaskEvents.ScheduledTaskNotFound> {
	public constructor(context: Listener.Context) {
		super(context, {
			name: TaskEvents.ScheduledTaskNotFound,
			event: TaskEvents.ScheduledTaskNotFound
		});
	}

	public override run(task: string) {
		writeLog(this.container.logger, 'error', `[KairoJS tasks] There was no task found for "${task}"`);
	}
}
