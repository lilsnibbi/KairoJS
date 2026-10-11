import type { Guild, TextChannel } from 'discord.js';
import { isTextChannel } from '../../../utilities/discord/index';
import type { Result } from '../../../utilities/result/index';
import { Identifiers } from '../../errors/Identifiers';
import { resolveGuildChannelPredicate } from './internal/resolveGuildChannelPredicate';

export function resolveGuildTextChannel(
	parameter: string,
	guild: Guild
): Result<TextChannel, Identifiers.ArgumentGuildChannelError | Identifiers.ArgumentGuildTextChannelError> {
	return resolveGuildChannelPredicate(parameter, guild, isTextChannel, Identifiers.ArgumentGuildTextChannelError);
}
