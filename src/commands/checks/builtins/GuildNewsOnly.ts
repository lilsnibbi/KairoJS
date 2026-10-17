import {
	ChannelType,
	ChatInputCommandInteraction,
	ContextMenuCommandInteraction,
	Message,
	type TextBasedChannelTypes,
} from "discord.js";
import { Identifiers } from "../../errors/Identifiers";
import { AllFlowsPrecondition } from "../Precondition";

/**
 * Require a guild announcement channel or announcement thread. Available through CorePreconditions.
 * @deprecated Use the RunIn check with explicit channel types.
 */
export class GuildNewsOnlyCheck extends AllFlowsPrecondition {
	private readonly allowedTypes: TextBasedChannelTypes[] = [
		ChannelType.GuildAnnouncement,
		ChannelType.AnnouncementThread,
	];

	/**
	 * Check a message invocation. Require a guild announcement channel or announcement thread.
	 * @returns Ok to allow or a precondition error to deny. Any failed Discord fetch rejects.
	 */
	public messageRun(message: Message): AllFlowsPrecondition.Result {
		return this.allowedTypes.includes(message.channel.type)
			? this.ok()
			: this.makeSharedError();
	}

	/**
	 * Check a slash invocation. Require a guild announcement channel or announcement thread.
	 * @returns Ok to allow or a precondition error to deny. Any failed Discord fetch rejects.
	 */
	public async chatInputRun(
		interaction: ChatInputCommandInteraction,
	): AllFlowsPrecondition.AsyncResult {
		const channel = await this.fetchChannelFromInteraction(interaction);

		return this.allowedTypes.includes(channel.type)
			? this.ok()
			: this.makeSharedError();
	}

	/**
	 * Check a context-menu invocation. Require a guild announcement channel or announcement thread.
	 * @returns Ok to allow or a precondition error to deny. Any failed Discord fetch rejects.
	 */
	public async contextMenuRun(
		interaction: ContextMenuCommandInteraction,
	): AllFlowsPrecondition.AsyncResult {
		const channel = await this.fetchChannelFromInteraction(interaction);

		return this.allowedTypes.includes(channel.type)
			? this.ok()
			: this.makeSharedError();
	}

	private makeSharedError(): AllFlowsPrecondition.Result {
		return this.error({
			identifier: Identifiers.PreconditionGuildNewsOnly,
			message: "You can only run this command in server announcement channels.",
		});
	}
}
