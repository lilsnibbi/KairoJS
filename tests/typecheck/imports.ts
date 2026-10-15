import { expectTypeOf } from 'expect-type';
import type * as Root from 'kairojs';
import type * as Client from 'kairojs/client';
import type * as Commands from 'kairojs/commands';
import type * as Discord from 'kairojs/discord';
import type * as Events from 'kairojs/events';
import type * as Extensions from 'kairojs/extensions';
import type * as Localisation from 'kairojs/localisation';
import type * as Modules from 'kairojs/modules';
import type * as Scheduling from 'kairojs/scheduling';
import type * as Services from 'kairojs/services';
import type * as Sharding from 'kairojs/sharding';
import type * as Time from 'kairojs/time';
import type * as Utilities from 'kairojs/utilities';
import type * as Validation from 'kairojs/validation';

declare module 'kairojs' {
	interface Container {
		fromRoot: boolean;
	}
	interface ModuleStores {
		rootStore: Modules.ModuleStore<Modules.Module, 'rootStore'>;
	}
	interface Preconditions {
		RootCheck: { root: boolean };
	}
	interface Tasks {
		rootJob: { id: number };
	}
	interface ShardRequests {
		rootRequest: { input: null; output: string };
	}
}
expectTypeOf<Client.KairoClient>().toEqualTypeOf<Root.KairoClient>();
expectTypeOf<Client.KairoClientOptions>().toEqualTypeOf<Root.KairoClientOptions>();
expectTypeOf<Commands.Command>().toEqualTypeOf<Root.Command>();
expectTypeOf<Discord.Pagination>().toEqualTypeOf<Root.Pagination>();
expectTypeOf<Events.Listener>().toEqualTypeOf<Root.Listener>();
expectTypeOf<Extensions.ExtensionOptions>().toEqualTypeOf<Root.ExtensionOptions>();
expectTypeOf<Localisation.InternationalizationOptions>().toEqualTypeOf<Root.InternationalizationOptions>();
expectTypeOf<Modules.Module>().toEqualTypeOf<Root.Module>();
expectTypeOf<Scheduling.TaskScheduler>().toEqualTypeOf<Root.TaskScheduler>();
expectTypeOf<Services.Service>().toEqualTypeOf<Root.Service>();
expectTypeOf<Sharding.ShardManager>().toEqualTypeOf<Root.ShardManager>();
expectTypeOf<Time.Duration>().toEqualTypeOf<Root.Duration>();
expectTypeOf<Utilities.Result<number, Error>>().toEqualTypeOf<Root.Result<number, Error>>();
expectTypeOf<Validation.Type<string>>().toEqualTypeOf<Root.Type<string>>();
expectTypeOf<Client.Container['fromRoot']>().toEqualTypeOf<boolean>();
expectTypeOf<Modules.ModuleOf<'rootStore'>>().toEqualTypeOf<Root.Module>();
expectTypeOf<Commands.Preconditions['RootCheck']>().toEqualTypeOf<{ root: boolean }>();
expectTypeOf<Scheduling.TaskPayload<'rootJob'>>().toEqualTypeOf<{ id: number }>();

export function requestTypes(client: Client.KairoClient, manager: Sharding.ShardManager) {
	expectTypeOf(client.sharding.request(0, 'rootRequest', null)).toEqualTypeOf<Promise<string>>();
	expectTypeOf(manager.request(0, 'rootRequest', null)).toEqualTypeOf<Promise<string>>();
	// @ts-expect-error Invalid root-augmented payload is rejected through the category.
	void client.sharding.request(0, 'rootRequest', {});
	// @ts-expect-error Invalid root-augmented payload is rejected through the root type.
	const invalid: Root.TaskPayload<'rootJob'> = { id: 'bad' };
	void invalid;
}

// @ts-expect-error Every public entrypoint uses named exports.
import defaultCommands from 'kairojs/commands';

void defaultCommands;

// @ts-expect-error There are no arbitrary deep category paths.
import type { Command as DeepCommand } from 'kairojs/commands/Command';
// @ts-expect-error Package metadata is not a public entrypoint.
import metadata from 'kairojs/package.json';
// @ts-expect-error Client implementation files remain private.
import type { KairoClient as PrivateClient } from 'kairojs/src/core/client/KairoClient';
// @ts-expect-error Category files are not additional supported subpaths.
import type { Command as PrivateCommand } from 'kairojs/src/public/commands';
export type PrivatePaths = [PrivateClient, PrivateCommand, DeepCommand];
void metadata;
