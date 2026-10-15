import type { Guild, ThreadChannel } from 'discord.js';
import { isPrivateThreadChannel } from '../../../utilities/discord/index';
import type { Result } from '../../../utilities/result/index';
import { Identifiers } from '../../errors/Identifiers';
import { resolveGuildChannelPredicate } from './internal/resolveGuildChannelPredicate';

export function resolveGuildPrivateThreadChannel(
	parameter: string,
	guild: Guild
): Result<
	ThreadChannel,
	Identifiers.ArgumentGuildChannelError | Identifiers.ArgumentGuildThreadChannelError | Identifiers.ArgumentGuildPrivateThreadChannelError
> {
	return resolveGuildChannelPredicate(parameter, guild, isPrivateThreadChannel, Identifiers.ArgumentGuildPrivateThreadChannelError);
}
