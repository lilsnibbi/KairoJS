import type {
	ChatInputCommandInteraction,
	ContextMenuCommandInteraction,
	Message,
} from "discord.js";
import { Identifiers } from "../../errors/Identifiers";
import { AllFlowsPrecondition } from "../Precondition";

export class GuildOnlyCheck extends AllFlowsPrecondition {
	public messageRun(message: Message): AllFlowsPrecondition.Result {
		return message.guildId === null ? this.makeSharedError() : this.ok();
	}

	public chatInputRun(
		interaction: ChatInputCommandInteraction,
	): AllFlowsPrecondition.Result {
		return interaction.guildId === null ? this.makeSharedError() : this.ok();
	}

	public contextMenuRun(
		interaction: ContextMenuCommandInteraction,
	): AllFlowsPrecondition.Result {
		return interaction.guildId === null ? this.makeSharedError() : this.ok();
	}

	private makeSharedError(): AllFlowsPrecondition.Result {
		return this.error({
			identifier: Identifiers.PreconditionGuildOnly,
			message: "You cannot run this command in DMs.",
		});
	}
}
