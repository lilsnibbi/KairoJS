import type { Guild, VoiceChannel } from 'discord.js';
import { isVoiceChannel } from '../../../utilities/discord/index';
import type { Result } from '../../../utilities/result/index';
import { Identifiers } from '../../errors/Identifiers';
import { resolveGuildChannelPredicate } from './internal/resolveGuildChannelPredicate';

export function resolveGuildVoiceChannel(
	parameter: string,
	guild: Guild
): Result<VoiceChannel, Identifiers.ArgumentGuildChannelError | Identifiers.ArgumentGuildVoiceChannelError> {
	return resolveGuildChannelPredicate(parameter, guild, isVoiceChannel, Identifiers.ArgumentGuildVoiceChannelError);
}
