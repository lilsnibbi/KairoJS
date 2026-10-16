import type { CommandInteraction, DMChannel, Message } from "discord.js";
import { isDMChannel } from "../../../utilities/discord/index";
import { Result } from "../../../utilities/result/index";
import { Identifiers } from "../../errors/Identifiers";
import { resolveChannel } from "./channel";

/**
 * Resolve a cached channel by ID or mention and require a non-partial DM channel.
 * @param parameter - Channel ID or mention.
 * @param messageOrInteraction - Invocation selecting the cache.
 * @returns A full DM channel, or a not-found/type-mismatch identifier.
 */
export function resolveDMChannel(
	parameter: string,
	messageOrInteraction: Message | CommandInteraction,
): Result<
	DMChannel,
	Identifiers.ArgumentChannelError | Identifiers.ArgumentDMChannelError
> {
	const result = resolveChannel(parameter, messageOrInteraction);
	return result.mapInto((value) => {
		if (isDMChannel(value) && !value.partial) {
			return Result.ok(value);
		}

		return Result.err<Identifiers.ArgumentDMChannelError>(
			Identifiers.ArgumentDMChannelError,
		);
	});
}
