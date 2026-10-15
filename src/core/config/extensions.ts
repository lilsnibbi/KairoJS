import { LocaleExtension } from '../../extensions/localisation/extension';
import type { InternationalizationOptions } from '../../extensions/localisation/types';
import { PatternExtension } from '../../extensions/patternCommands/extension';
import { TasksExtension } from '../../extensions/scheduledTasks/extension';
import type { TaskSchedulerOptions } from '../../extensions/scheduledTasks/types/TaskTypes';
import { ServicesExtension } from '../../extensions/services/extension';
import { SubcommandsExtension } from '../../extensions/subcommands/extension';
import type { CooldownOptions } from '../client/KairoClient';
import { Extension } from '../lifecycle/Extension';

export interface SubcommandsOptions {
	logErrors?: boolean;
	defaultCooldown?: CooldownOptions;
}

/** Built-ins are available by default. Pass false to turn one off. */
export interface ExtensionOptions {
	localisation?: false | InternationalizationOptions;
	scheduledtasks?: false | TaskSchedulerOptions;
	patternCommands?: false | Record<string, never>;
	subcommands?: false | SubcommandsOptions;
	services?: false | Record<string, never>;
	/** Custom classes run after built-ins, once each, in this order. */
	custom?: readonly (typeof Extension)[];
}

export const builtInExtensions = {
	localisation: LocaleExtension,
	scheduledtasks: TasksExtension,
	patternCommands: PatternExtension,
	subcommands: SubcommandsExtension,
	services: ServicesExtension
} as const;

export function resolveExtensions(options: ExtensionOptions = {}): readonly (typeof Extension)[] {
	if (!options || typeof options !== 'object' || Array.isArray(options))
		throw new TypeError('Use extensions: { localisation: {}, scheduledtasks: {}, custom: [YourExtension] }.');
	for (const [key, value] of Object.entries(options)) {
		if (key === 'custom') continue;
		if (!(key in builtInExtensions)) throw new TypeError(`Unknown built-in extension "${key}".`);
		if (value !== undefined && value !== false && (value === null || typeof value !== 'object' || Array.isArray(value)))
			throw new TypeError(`extensions.${key} must be false or an options object.`);
	}
	if (options.custom !== undefined && !Array.isArray(options.custom)) throw new TypeError('extensions.custom must be an array.');
	const builtins = new Set<typeof Extension>(Object.values(builtInExtensions));
	for (const extension of options.custom ?? []) {
		if (typeof extension !== 'function' || !(extension.prototype instanceof Extension))
			throw new TypeError('Custom extensions must extend Extension.');
		if (builtins.has(extension)) throw new TypeError('Configure built-in extensions by name, not in extensions.custom.');
	}
	return Object.freeze([
		...new Set([
			...Object.entries(builtInExtensions)
				.filter(([key]) => options[key as keyof typeof builtInExtensions] !== false)
				.map(([, value]) => value),
			...(options.custom ?? [])
		])
	]);
}
