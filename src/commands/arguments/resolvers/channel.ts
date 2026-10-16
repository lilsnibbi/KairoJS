import type { CommandInteraction, Message, Snowflake } from "discord.js";
import { container } from "../../../core/modules/index";
import {
	ChannelMentionRegex,
	type ChannelTypes,
} from "../../../utilities/discord/index";
import { Result } from "../../../utilities/result/index";
import { Identifiers } from "../../errors/Identifiers";

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
