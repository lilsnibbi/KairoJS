import type {
	CategoryChannel,
	PartialTextBasedChannelFields,
} from "discord.js";
import type { ArgumentTypes } from "../../index";
import type { ChannelTypes, VoiceBasedChannelTypes } from "../utility-types";

/** A type to extend multiple discord types and simplify usage in {@link MessagePrompter} */
export type MessagePrompterMessage = ArgumentTypes<
	PartialTextBasedChannelFields["send"]
>[0];

/** Supported prompt channel types, excluding voice/stage and category channels. Runtime strategies also verify they can send text. */
export type MessagePrompterChannelTypes = Exclude<
	ChannelTypes,
	VoiceBasedChannelTypes | CategoryChannel
>;
