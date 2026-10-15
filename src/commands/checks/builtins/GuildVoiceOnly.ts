import type { ChatInputCommandInteraction, ContextMenuCommandInteraction, Message } from 'discord.js';
import { isVoiceChannel } from '../../../utilities/discord/index';
import { Identifiers } from '../../errors/Identifiers';
import { AllFlowsPrecondition } from '../Precondition';

export class GuildVoiceOnlyCheck extends AllFlowsPrecondition {
	public messageRun(message: Message): AllFlowsPrecondition.Result {
		return isVoiceChannel(message.channel) ? this.ok() : this.makeSharedError();
	}

	public async chatInputRun(interaction: ChatInputCommandInteraction): AllFlowsPrecondition.AsyncResult {
		const channel = await this.fetchChannelFromInteraction(interaction);
		return isVoiceChannel(channel) ? this.ok() : this.makeSharedError();
	}

	public async contextMenuRun(interaction: ContextMenuCommandInteraction): AllFlowsPrecondition.AsyncResult {
		const channel = await this.fetchChannelFromInteraction(interaction);
		return isVoiceChannel(channel) ? this.ok() : this.makeSharedError();
	}

	private makeSharedError(): AllFlowsPrecondition.Result {
		return this.error({
			identifier: Identifiers.PreconditionGuildVoiceOnly,
			message: 'You can only run this command in server voice channels.'
		});
	}
}
