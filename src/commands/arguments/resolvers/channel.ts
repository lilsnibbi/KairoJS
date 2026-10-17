import type { CommandInteraction, Message, Snowflake } from "discord.js";
import { container } from "../../../core/modules/index";
import {
	ChannelMentionRegex,
	type ChannelTypes,
} from "../../../utilities/discord/index";
import { Result } from "../../../utilities/result/index";
import { Identifiers } from "../../errors/Identifiers";

/**
 * Look up a cached channel by ID or mention in the current guild, or the client cache for DMs.
 * @param parameter - Channel ID or mention.
 * @param messageOrInteraction - Invocation that selects the channel cache.
 * @returns The cached channel, or ArgumentChannelError. No HTTP fetch is performed.
 */
export function resolveChannel(
	parameter: string,
	messageOrInteraction: Message | CommandInteraction,
): Result<ChannelTypes, Identifiers.ArgumentChannelError> {
	const channelId = (ChannelMentionRegex.exec(parameter)?.[1] ??
		parameter) as Snowflake;
	const channel = (
		messageOrInteraction.guild
			? messageOrInteraction.guild.channels
			: container.client.channels
	).cache.get(channelId);

	if (channel) {
		return Result.ok(channel as ChannelTypes);
	}

	return Result.err(Identifiers.ArgumentChannelError);
}
