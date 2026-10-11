import type { acquire } from '../commands/registration/registries';
import type { LocaleManager } from '../extensions/localisation/LocaleManager';
import type { TaskScheduler } from '../extensions/scheduledTasks/TaskScheduler';
import type { Services } from '../extensions/services/Services';
import type { KairoClient } from './client/KairoClient';
import type { LoggerLike } from './logging/LoggerLike';
import { ModuleRegistry } from './modules/ModuleRegistry';

/** Shared client services. Add your own properties by augmenting kairojs. */
export interface Container {
	modules: ModuleRegistry;
	client: KairoClient;
	logger: LoggerLike;
	applicationCommandRegistries: { acquire: typeof acquire };
	i18n: LocaleManager;
	tasks: TaskScheduler;
	services: Services;
}

/** Services for the active client. Optional features fill their own entries. */
export const container = { modules: new ModuleRegistry() } as Container;
