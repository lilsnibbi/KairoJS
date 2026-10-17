import type { DMChannel, Message, PartialDMChannel } from "discord.js";
import { isDMChannel } from "../../../utilities/discord/index";
import { Result } from "../../../utilities/result/index";
import { Identifiers } from "../../errors/Identifiers";
import { resolveChannel } from "./channel";

/**
 * Resolve a cached DM channel by ID or mention, allowing partial channels.
 * @param parameter - Channel ID or mention.
 * @param message - Invocation selecting the cache.
 * @returns A full or partial DM channel, or a not-found/type-mismatch identifier.
 */
export function resolvePartialDMChannel(
	parameter: string,
	message: Message,
): Result<
	DMChannel | PartialDMChannel,
	Identifiers.ArgumentChannelError | Identifiers.ArgumentDMChannelError
> {
	const result = resolveChannel(parameter, message);
	return result.mapInto((channel) => {
		if (isDMChannel(channel)) {
			return Result.ok(channel);
		}

		return Result.err<Identifiers.ArgumentDMChannelError>(
			Identifiers.ArgumentDMChannelError,
		);
	});
}
