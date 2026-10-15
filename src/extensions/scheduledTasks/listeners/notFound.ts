import { writeEvent } from '../../../core/logging/diagnostics';
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
		writeEvent(this.container.logger, 'error', {
			component: 'tasks',
			event: 'task_not_found',
			message: 'Scheduled task module not found; check registered task names.',
			context: { task }
		});
	}
}
