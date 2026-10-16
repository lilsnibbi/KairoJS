import type { Guild, NewsChannel } from "discord.js";
import { isNewsChannel } from "../../../utilities/discord/index";
import type { Result } from "../../../utilities/result/index";
import { Identifiers } from "../../errors/Identifiers";
import { resolveGuildChannelPredicate } from "./internal/resolveGuildChannelPredicate";

export function resolveGuildNewsChannel(
	parameter: string,
	guild: Guild,
): Result<
	NewsChannel,
	| Identifiers.ArgumentGuildChannelError
	| Identifiers.ArgumentGuildNewsChannelError
> {
	return resolveGuildChannelPredicate(
		parameter,
		guild,
		isNewsChannel,
		Identifiers.ArgumentGuildNewsChannelError,
	);
}
