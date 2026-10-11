import { AliasModuleStore } from '../core/modules/index';
import type { Args } from './arguments/Args';
import { Command } from './Command';
import { registries } from './registration/registries';

/** Stores command modules and their aliases. */
export class CommandStore extends AliasModuleStore<Command, 'commands'> {
	public constructor() {
		super(Command, { name: 'commands' });
	}

	/** Get all the command categories. */
	public get categories(): string[] {
		const categories = new Set(this.map((command) => command.category));
		categories.delete(null);
		return [...categories] as string[];
	}

	public override async insert(module: Command): Promise<Command> {
		const accepted = await super.insert(module);
		// Another staged candidate may have removed this name's shared registry during failed activation.
		if (super.get(accepted.name) === accepted) registries.set(accepted.name, accepted.applicationCommandRegistry);
		return accepted;
	}

	public override unload(name: string | Command): Promise<Command<Args, Command.Options>> {
		const module = this.resolve(name);

		// Remove the aliases from the store
		for (const nameOrId of module.applicationCommandRegistry.chatInputCommands) {
			const aliasedPiece = this.aliases.get(nameOrId);
			if (aliasedPiece === module) {
				this.aliases.delete(nameOrId);
			}
		}

		for (const nameOrId of module.applicationCommandRegistry.contextMenuCommands) {
			const aliasedPiece = this.aliases.get(nameOrId);
			if (aliasedPiece === module) {
				this.aliases.delete(nameOrId);
			}
		}

		// Remove the registry from the application command registries
		const current = super.get(module.name);
		if ((!current || current === module) && registries.get(module.name) === module.applicationCommandRegistry)
			registries.delete(module.name);

		return super.unload(name);
	}
}
