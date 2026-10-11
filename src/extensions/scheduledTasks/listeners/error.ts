import { writeLog } from '../../../core/logging/diagnostics';
import { Listener } from '../../../events/listener';
import { Task } from '../Task';
import { TaskEvents } from '../types/TaskEvents';

export class ErrorListener extends Listener<typeof TaskEvents.ScheduledTaskError> {
	public constructor(context: Listener.Context) {
		super(context, {
			name: TaskEvents.ScheduledTaskError,
			event: TaskEvents.ScheduledTaskError
		});
	}

	public override run(error: unknown, task: Task) {
		const { name, location } = task;
		writeLog(this.container.logger, 'error', `Encountered error on scheduled task "${name}" at path "${location.full}"`, error);
	}
}
