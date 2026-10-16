import { afterEach, expect, test } from "bun:test";
import { ChannelType, DMChannel, Message } from "discord.js";
import { KairoClient, PatternCommand, PatternCommandEvents } from "kairojs";
import type { MessageParseListener } from "../../../src/extensions/patternCommands/listeners/messageParse";
import type { PatternCommandPrePayload } from "../../../src/extensions/patternCommands/types";

let client: KairoClient | undefined;
afterEach(async () => {
	await client?.destroy();
	client = undefined;
});

test("full-name patterns match words within a message but exclude substrings", async () => {
	client = new KairoClient({
		intents: [],
		logger: { debug() {}, notif() {}, alert() {}, error() {} },
	});
	const owner = client;
	class Lore extends PatternCommand {
		constructor(context: PatternCommand.Context) {
			super(context, { matchFullName: true });
		}
		override messageRun() {}
	}
	await owner.modules.addModule({
		store: "patterns",
		name: "lore",
		module: Lore,
	});
	await owner.load();
	const parser = owner.modules
		.require("listeners")
		.get("PatternMessageParse") as MessageParseListener;
	const matches: string[] = [];
	owner.on(PatternCommandEvents.PreCommandRun, (payload) => {
		matches.push((payload as PatternCommandPrePayload).message.content);
	});
	const channel = Reflect.construct(DMChannel, [
		owner,
		{ id: "123456789012345678", type: ChannelType.DM },
	]) as DMChannel;
	owner.channels.cache.set(channel.id, channel);
	for (const content of [
		"lore",
		"some lore here",
		"lore!",
		"explore",
		"folklore",
	]) {
		const message = Reflect.construct(Message, [
			owner,
			{
				id: "123456789012345679",
				channel_id: channel.id,
				content,
				timestamp: new Date().toISOString(),
				author: {
					id: "123456789012345680",
					username: "tester",
					discriminator: "0",
					avatar: null,
				},
			},
		]) as Message;
		await parser.run(message);
	}
	expect(matches).toEqual(["lore", "some lore here", "lore!"]);
});
