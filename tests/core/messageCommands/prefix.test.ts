import { afterEach, expect, test } from "bun:test";
import { ChannelType, DMChannel, Message } from "discord.js";
import { Command, Events, RiloClient } from "rilo";
import { PrefixedMessageListener } from "../../../src/commands/message/listeners/prefixedMessage";
import { PreMessageParserListener } from "../../../src/commands/message/listeners/preMessageParser";

let client: RiloClient | undefined;
afterEach(async () => {
	await client?.destroy();
	client = undefined;
});

for (const regexPrefix of [/^!/g, /^!/y]) {
	test(`stateful regex prefix ${regexPrefix.flags} dispatches consecutive messages without changing regex state`, async () => {
		client = new RiloClient({
			intents: [],
			regexPrefix,
			logger: { debug() {}, notif() {}, alert() {}, error() {} },
		});
		class Ping extends Command {
			override messageRun() {}
		}
		await client.modules.addModule({
			store: "commands",
			name: "ping",
			module: Ping,
		});
		await client.load();
		const context = {
			name: "test-parser",
			root: "::virtual::",
			path: "::virtual::",
			store: client.modules.require("listeners"),
		};
		const preParser = new PreMessageParserListener(context);
		const parser = new PrefixedMessageListener(context);
		const parameters: string[] = [];
		client.on(Events.PrefixedMessage, (message, prefix) => {
			parser.run(message, prefix);
		});
		client.on(Events.PreMessageCommandRun, (payload) => {
			parameters.push(payload.parameters);
		});
		const channel = Reflect.construct(DMChannel, [
			client,
			{ id: "123456789012345678", type: ChannelType.DM },
		]) as DMChannel;
		client.channels.cache.set(channel.id, channel);
		for (const suffix of ["first", "second", "third"]) {
			const message = Reflect.construct(Message, [
				client,
				{
					id: "123456789012345679",
					channel_id: channel.id,
					content: `!ping ${suffix}`,
					timestamp: new Date().toISOString(),
					author: {
						id: "123456789012345680",
						username: "tester",
						discriminator: "0",
						avatar: null,
					},
				},
			]) as Message;
			await preParser.run(message);
		}
		expect(parameters).toEqual(["first", "second", "third"]);
		expect(regexPrefix.lastIndex).toBe(0);
	});
}
