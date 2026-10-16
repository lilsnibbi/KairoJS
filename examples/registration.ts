import { container } from "kairojs/client";
import type { Command } from "kairojs/commands";

export function registerCommand(
	registry: Command.Registry,
	build: Parameters<Command.Registry["registerChatInputCommand"]>[0],
): void {
	// Every shard loads the commands. Only shard 0 writes registrations to Discord.
	if ((container.client.sharding.id ?? 0) === 0)
		registry.registerChatInputCommand(build);
}
