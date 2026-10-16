import {
	ChannelType,
	ChatInputCommandInteraction,
	ContextMenuCommandInteraction,
	Message,
} from "discord.js";
import { Identifiers } from "../../errors/Identifiers";
import { AllFlowsPrecondition } from "../Precondition";

export class GuildPrivateThreadOnlyCheck extends AllFlowsPrecondition {
	public messageRun(message: Message): AllFlowsPrecondition.Result {
		return message.thread?.type === ChannelType.PrivateThread
			? this.ok()
			: this.makeSharedError();
	}

	public async chatInputRun(
		interaction: ChatInputCommandInteraction,
	): AllFlowsPrecondition.AsyncResult {
		const channel = await this.fetchChannelFromInteraction(interaction);
		return channel.type === ChannelType.PrivateThread
			? this.ok()
			: this.makeSharedError();
	}

	public async contextMenuRun(
		interaction: ContextMenuCommandInteraction,
	): AllFlowsPrecondition.AsyncResult {
		const channel = await this.fetchChannelFromInteraction(interaction);
		return channel.type === ChannelType.PrivateThread
			? this.ok()
			: this.makeSharedError();
	}

	private makeSharedError(): AllFlowsPrecondition.Result {
		return this.error({
			identifier: Identifiers.PreconditionGuildPrivateThreadOnly,
			message:
				"You can only run this command in private server thread channels.",
		});
	}
}
