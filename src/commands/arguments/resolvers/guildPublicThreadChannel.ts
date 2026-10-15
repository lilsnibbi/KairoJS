import type { Guild, ThreadChannel } from 'discord.js';
import { isPublicThreadChannel } from '../../../utilities/discord/index';
import type { Result } from '../../../utilities/result/index';
import { Identifiers } from '../../errors/Identifiers';
import { resolveGuildChannelPredicate } from './internal/resolveGuildChannelPredicate';

export function resolveGuildPublicThreadChannel(
	parameter: string,
	guild: Guild
): Result<
	ThreadChannel,
	Identifiers.ArgumentGuildChannelError | Identifiers.ArgumentGuildThreadChannelError | Identifiers.ArgumentGuildPublicThreadChannelError
> {
	return resolveGuildChannelPredicate(parameter, guild, isPublicThreadChannel, Identifiers.ArgumentGuildPublicThreadChannelError);
}
