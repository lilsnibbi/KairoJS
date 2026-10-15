import type { Guild, ThreadChannel } from 'discord.js';
import { isNewsThreadChannel } from '../../../utilities/discord/index';
import type { Result } from '../../../utilities/result/index';
import { Identifiers } from '../../errors/Identifiers';
import { resolveGuildChannelPredicate } from './internal/resolveGuildChannelPredicate';

export function resolveGuildNewsThreadChannel(
	parameter: string,
	guild: Guild
): Result<
	ThreadChannel,
	Identifiers.ArgumentGuildChannelError | Identifiers.ArgumentGuildThreadChannelError | Identifiers.ArgumentGuildNewsThreadChannelError
> {
	return resolveGuildChannelPredicate(parameter, guild, isNewsThreadChannel, Identifiers.ArgumentGuildNewsThreadChannelError);
}
