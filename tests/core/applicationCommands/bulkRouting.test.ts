import { afterEach, expect, spyOn, test } from 'bun:test';
import { ApplicationCommandManager, ApplicationCommandType, type Client } from 'discord.js';
import { Command, KairoClient } from 'kairojs';
import { handleBulkOverwrite, setBulkOverwriteRetries } from '../../../src/commands/registration/registries';

let client: KairoClient | undefined;
afterEach(async () => {
	await client?.destroy();
	client = undefined;
	setBulkOverwriteRetries(null);
});

class TestCommandManager extends ApplicationCommandManager {
	public constructor(client: Client) {
		super(client as Client<true>);
	}
}

for (const guildId of [undefined, '123456789012345681']) {
	test(`bulk registration retries a failed ${guildId ? 'guild' : 'global'} overwrite before storing its returned ID`, async () => {
		client = new KairoClient({ intents: [], logger: { debug() {}, notif() {}, alert() {}, error() {} } });
		await client.load();
		const store = client.modules.require('commands');
		await store.addModule({ name: 'retry', module: Command });
		const command = store.get('retry')!;
		command.applicationCommandRegistry.registerChatInputCommand(
			{ name: 'retry', description: 'Retry' },
			guildId ? { guildIds: [guildId] } : {}
		);
		Object.defineProperty(client, 'application', { value: { id: '123456789012345678' }, configurable: true });
		let attempts = 0;
		spyOn(client.rest, 'put').mockImplementation(async (_route, request) => {
			const body = JSON.parse(JSON.stringify(request?.body)) as Record<string, unknown>[];
			if (!body.length) return [];
			if (++attempts === 1) throw new Error('temporary registration failure');
			return [{ ...body[0], id: '123456789012345690', application_id: '123456789012345678', version: '123456789012345680' }];
		});
		setBulkOverwriteRetries(2);
		await handleBulkOverwrite(store, new TestCommandManager(client));
		expect(attempts).toBe(2);
		expect(store.get('123456789012345690')?.name).toBe('retry');
	});
}

for (const guildId of [undefined, '123456789012345681']) {
	test(`bulk registration routes identical names by command type in ${guildId ? 'guild' : 'global'} scope`, async () => {
		client = new KairoClient({ intents: [], logger: { debug() {}, notif() {}, alert() {}, error() {} } });
		await client.load();
		const store = client.modules.require('commands');
		for (const name of ['slash', 'user', 'message']) await store.addModule({ name, module: Command });
		const slash = store.get('slash')!;
		const user = store.get('user')!;
		const message = store.get('message')!;
		const options = guildId ? { guildIds: [guildId] } : {};
		slash.applicationCommandRegistry.registerChatInputCommand({ name: 'inspect', description: 'Inspect' }, options);
		user.applicationCommandRegistry.registerContextMenuCommand({ name: 'inspect', type: ApplicationCommandType.User }, options);
		message.applicationCommandRegistry.registerContextMenuCommand({ name: 'inspect', type: ApplicationCommandType.Message }, options);
		Object.defineProperty(client, 'application', { value: { id: '123456789012345678' }, configurable: true });
		spyOn(client.rest, 'put').mockImplementation(async (_route, request) => {
			const body = JSON.parse(JSON.stringify(request?.body)) as Record<string, unknown>[];
			return body.map((data, index) => ({
				...data,
				id: String(123456789012345690n + BigInt(index)),
				application_id: '123456789012345678',
				guild_id: guildId,
				version: '123456789012345680'
			}));
		});
		await handleBulkOverwrite(store, new TestCommandManager(client));
		expect(store.get('123456789012345690')).toBe(slash);
		expect(store.get('123456789012345691')).toBe(user);
		expect(store.get('123456789012345692')).toBe(message);
	});
}
