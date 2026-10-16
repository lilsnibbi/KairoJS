import type { CategoryChannel, Guild } from "discord.js";
import { isCategoryChannel } from "../../../utilities/discord/index";
import type { Result } from "../../../utilities/result/index";
import { Identifiers } from "../../errors/Identifiers";
import { resolveGuildChannelPredicate } from "./internal/resolveGuildChannelPredicate";

export function resolveGuildCategoryChannel(
	parameter: string,
	guild: Guild,
): Result<
	CategoryChannel,
	| Identifiers.ArgumentGuildChannelError
	| Identifiers.ArgumentGuildCategoryChannelError
> {
	return resolveGuildChannelPredicate(
		parameter,
		guild,
		isCategoryChannel,
		Identifiers.ArgumentGuildCategoryChannelError,
	);
}
