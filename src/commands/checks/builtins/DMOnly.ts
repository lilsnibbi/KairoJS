import type { ChatInputCommandInteraction, ContextMenuCommandInteraction, Message } from 'discord.js';
import { Identifiers } from '../../errors/Identifiers';
import { AllFlowsPrecondition } from '../Precondition';

export class DMOnlyCheck extends AllFlowsPrecondition {
	public messageRun(message: Message): AllFlowsPrecondition.Result {
		return message.guild === null ? this.ok() : this.makeSharedError();
	}

	public chatInputRun(interaction: ChatInputCommandInteraction): AllFlowsPrecondition.Result {
		return interaction.guildId === null ? this.ok() : this.makeSharedError();
	}

	public contextMenuRun(interaction: ContextMenuCommandInteraction): AllFlowsPrecondition.Result {
		return interaction.guildId === null ? this.ok() : this.makeSharedError();
	}

	private makeSharedError(): AllFlowsPrecondition.Result {
		return this.error({
			identifier: Identifiers.PreconditionDMOnly,
			message: 'You cannot run this command outside DMs.'
		});
	}
}
