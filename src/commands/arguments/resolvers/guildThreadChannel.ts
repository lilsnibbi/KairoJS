import type { Guild, ThreadChannel } from "discord.js";
import { isThreadChannel } from "../../../utilities/discord/index";
import type { Result } from "../../../utilities/result/index";
import { Identifiers } from "../../errors/Identifiers";
import { resolveGuildChannelPredicate } from "./internal/resolveGuildChannelPredicate";

export function resolveGuildThreadChannel(
	parameter: string,
	guild: Guild,
): Result<
	ThreadChannel,
	| Identifiers.ArgumentGuildChannelError
	| Identifiers.ArgumentGuildThreadChannelError
> {
	return resolveGuildChannelPredicate(
		parameter,
		guild,
		isThreadChannel,
		Identifiers.ArgumentGuildThreadChannelError,
	);
}
