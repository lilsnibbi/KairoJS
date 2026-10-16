import type { Guild, StageChannel } from "discord.js";
import { isStageChannel } from "../../../utilities/discord/index";
import type { Result } from "../../../utilities/result/index";
import { Identifiers } from "../../errors/Identifiers";
import { resolveGuildChannelPredicate } from "./internal/resolveGuildChannelPredicate";

export function resolveGuildStageVoiceChannel(
	parameter: string,
	guild: Guild,
): Result<
	StageChannel,
	| Identifiers.ArgumentGuildChannelError
	| Identifiers.ArgumentGuildStageVoiceChannelError
> {
	return resolveGuildChannelPredicate(
		parameter,
		guild,
		isStageChannel,
		Identifiers.ArgumentGuildStageVoiceChannelError,
	);
}
