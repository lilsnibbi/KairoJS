import { parseEmoji } from "discord.js";
import {
	createTwemojiRegex,
	EmojiRegex,
} from "../../../utilities/discord/constants/index";
import { Result } from "../../../utilities/result/index";
import { Identifiers } from "../../errors/Identifiers";

const TwemojiRegex = createTwemojiRegex();

/**
 * Find a Unicode emoji or parse a custom Discord emoji.
 * @param parameter - Input text.
 * @returns Emoji metadata, or ArgumentEmojiError when none can be parsed.
 */
export function resolveEmoji(
	parameter: string,
): Result<EmojiObject, Identifiers> {
	const twemoji = TwemojiRegex.exec(parameter)?.[0] ?? null;

	TwemojiRegex.lastIndex = 0;

	if (twemoji) {
		return Result.ok<EmojiObject>({
			name: twemoji,
			id: null,
		});
	}

	const emojiId = EmojiRegex.test(parameter);

	if (emojiId) {
		const resolved = parseEmoji(parameter) as EmojiObject | null;

		if (resolved) {
			return Result.ok(resolved);
		}
	}

	return Result.err(Identifiers.ArgumentEmojiError);
}

/** Parsed Unicode or custom Discord emoji. */
export interface EmojiObject {
	/** Unicode emoji text or custom emoji name, or null when unavailable. */
	name: string | null;
	/** Custom emoji ID, or null for Unicode emoji. */
	id: string | null;
	/** Whether a custom emoji is animated, when known. */
	animated?: boolean;
}
