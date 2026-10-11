import type { ApplicationCommandRegistry } from './Registry';
import {
	acquire,
	getBulkOverwriteRetries,
	getDefaultBehaviorWhenNotIdentical,
	getDefaultGuildIds,
	registries,
	setBulkOverwriteRetries,
	setDefaultBehaviorWhenNotIdentical,
	setDefaultGuildIds
} from './registries';

export const ApplicationCommandRegistries = {
	acquire,
	setDefaultBehaviorWhenNotIdentical,
	setDefaultGuildIds,
	setBulkOverwriteRetries,
	getDefaultGuildIds,
	getDefaultBehaviorWhenNotIdentical,
	getBulkOverwriteRetries,
	get registries(): ReadonlyMap<string, ApplicationCommandRegistry> {
		return registries;
	}
};
