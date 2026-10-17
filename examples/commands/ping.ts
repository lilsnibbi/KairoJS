import { MessageFlags } from "discord.js";
import { Command } from "virello/commands";
import { registerCommand } from "../registration";

export default class PingCommand extends Command {
	static override options: Command.Options = {
		description: "Check whether this shard is awake.",
	};

	override registerApplicationCommands(registry: Command.Registry): void {
		registerCommand(registry, (builder) =>
			builder.setName(this.name).setDescription(this.description),
		);
	}

	override async chatInputRun(
		interaction: Command.ChatInputCommandInteraction,
	): Promise<void> {
		const client = this.container.client;
		await interaction.reply({
			content: `Pong! Shard ${client.sharding.id}, gateway ping ${Math.round(client.ws.ping)} ms.`,
			flags: MessageFlags.Ephemeral,
		});
	}
}
