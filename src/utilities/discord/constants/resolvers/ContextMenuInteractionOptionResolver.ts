import {
	type APIContextMenuInteraction,
	type APIInteractionDataResolvedGuildMember,
	type APIMessage,
	type APIMessageApplicationCommandInteractionDataResolved,
	type APIUser,
	type APIUserInteractionDataResolved,
	ApplicationCommandType
} from 'discord-api-types/v10';
import type { RequiredIf } from './util';

/** Service class for resolving (context menu) interaction options while working with the raw API. Based on {@linkplain https://github.com/discordjs/discord.js/blob/main/packages/discord.js/src/structures/CommandInteractionOptionResolver.js} */
export class ContextMenuInteractionOptionResolver {
	private readonly interaction: APIContextMenuInteraction;

	/** The interaction resolved data */
	private readonly resolved: APIMessageApplicationCommandInteractionDataResolved | APIUserInteractionDataResolved | null = null;

	public constructor(interaction: APIContextMenuInteraction) {
		this.interaction = interaction;

		this.resolved = 'resolved' in interaction.data ? (interaction.data.resolved ?? null) : null;
	}

	/** Get the target user for a context menu interaction */
	public getTargetUser(): APIUser {
		if (this.interaction.data.type !== ApplicationCommandType.User) {
			throw new Error('This method can only be used on user context menu interactions');
		}

		return (this.resolved as APIUserInteractionDataResolved).users[this.interaction.data.target_id];
	}

	/** Get the target member for a context menu interaction */
	public getTargetMember<Required extends boolean = false>(
		required?: Required
	): RequiredIf<Required, APIInteractionDataResolvedGuildMember>;
	public getTargetMember(required = false): APIInteractionDataResolvedGuildMember | null {
		if (this.interaction.data.type !== ApplicationCommandType.User) {
			throw new Error('This method can only be used on user context menu interactions');
		}

		const member = (this.resolved as APIUserInteractionDataResolved).members?.[this.interaction.data.target_id] ?? null;

		if (!member && required) {
			throw new Error('Member data is not present');
		}

		return member;
	}

	/** Get the target message for a context menu interaction */
	public getTargetMessage(): APIMessage {
		if (this.interaction.data.type !== ApplicationCommandType.Message) {
			throw new Error('This method can only be used on message context menu interactions');
		}

		return (this.resolved as APIMessageApplicationCommandInteractionDataResolved).messages[this.interaction.data.target_id];
	}
}
