import { MessageFlags } from 'discord.js';
import { Command } from 'kairojs/commands';
import { registerCommand } from '../registration';
import { formatStats } from '../stats';

export default class StatsCommand extends Command {
	static override options: Command.Options = { description: 'Ask every shard for its current stats.' };

	override registerApplicationCommands(registry: Command.Registry): void {
		registerCommand(registry, (builder) => builder.setName(this.name).setDescription(this.description));
	}

	override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const results = await this.container.client.sharding.broadcast('exampleStats', null, { timeoutMs: 5000 });
		await interaction.editReply(formatStats(results));
	}
}
