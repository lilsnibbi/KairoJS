import type { Guild, Snowflake } from "discord.js";
import {
	ChannelMentionRegex,
	SnowflakeRegex,
} from "../../../utilities/discord/constants/index";
import type { GuildBasedChannelTypes } from "../../../utilities/discord/index";
import { Result } from "../../../utilities/result/index";
import { Identifiers } from "../../errors/Identifiers";

/**
 * Look up a cached guild channel by ID, mention, or exact case-insensitive name.
 * @param parameter - Channel lookup text.
 * @param guild - Guild whose channel cache is searched.
 * @returns The channel, or ArgumentGuildChannelError.
 */
export function resolveGuildChannel(
	parameter: string,
	guild: Guild,
): Result<GuildBasedChannelTypes, Identifiers.ArgumentGuildChannelError> {
	const channel =
		resolveById(parameter, guild) ?? resolveByQuery(parameter, guild);

	if (channel) {
		return Result.ok(channel);
	}

	return Result.err(Identifiers.ArgumentGuildChannelError);
}

function resolveById(
	argument: string,
	guild: Guild,
): GuildBasedChannelTypes | null {
	const channelId =
		ChannelMentionRegex.exec(argument) ?? SnowflakeRegex.exec(argument);
	return channelId
		? ((guild.channels.cache.get(
				channelId[1] as Snowflake,
			) as GuildBasedChannelTypes) ?? null)
		: null;
}

function resolveByQuery(
	argument: string,
	guild: Guild,
): GuildBasedChannelTypes | null {
	const lowerCaseArgument = argument.toLowerCase();
	return (
		(guild.channels.cache.find(
			(channel) => channel.name.toLowerCase() === lowerCaseArgument,
		) as GuildBasedChannelTypes) ?? null
	);
}
