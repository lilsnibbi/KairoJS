import type { CommandInteraction, DMChannel, Message } from "discord.js";
import { isDMChannel } from "../../../utilities/discord/index";
import { Result } from "../../../utilities/result/index";
import { Identifiers } from "../../errors/Identifiers";
import { resolveChannel } from "./channel";

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
