import {
	type APIGuildMember,
	type APIInteractionDataResolvedGuildMember,
	type APIInteractionGuildMember,
	type APIMessage,
	type Attachment,
	BaseInteraction,
	type CategoryChannel,
	type Channel,
	ChannelType,
	type DMChannel,
	GuildMember,
	Message,
	type NewsChannel,
	type PartialDMChannel,
	type PartialGroupDMChannel,
	type PrivateThreadChannel,
	type PublicThreadChannel,
	type StageChannel,
	type TextChannel,
	type ThreadChannel,
	type VoiceBasedChannel,
	type VoiceChannel,
} from "discord.js";
import {
	isNullish,
	isNullishOrEmpty,
	isNullishOrZero,
	type Nullish,
} from "../index";
import type {
	AnyInteractableInteraction,
	ChannelTypes,
	GuildTextBasedChannelTypes,
	NonThreadGuildTextBasedChannelTypes,
	TextBasedChannelTypes,
} from "./utility-types";

/** Check whether a given channel is a {@link CategoryChannel} This checks for {@link ChannelType.GuildCategory}. */
export function isCategoryChannel(
	channel: ChannelTypes | Nullish,
): channel is CategoryChannel {
	return channel?.type === ChannelType.GuildCategory;
}

/** Check whether a given channel is a {@link DMChannel} This checks for {@link ChannelType.DM}. */
export function isDMChannel(
	channel: ChannelTypes | Nullish,
): channel is DMChannel | PartialDMChannel {
	return channel?.type === ChannelType.DM;
}

/** Check whether a given channel is a {@link PartialGroupDMChannel} This checks for {@link ChannelType.GroupDM}. */
export function isGroupChannel(
	channel: Channel | PartialDMChannel | Nullish,
): channel is PartialGroupDMChannel {
	return channel?.type === ChannelType.GroupDM;
}

/** Check if a channel comes from a guild. This checks that the channel is **not** {@link ChannelType.DM}. */
export function isGuildBasedChannel(
	channel: ChannelTypes | Nullish,
): channel is GuildTextBasedChannelTypes {
	return channel?.type !== ChannelType.DM;
}

/** Check whether a channel comes from a guild. */
export function isGuildBasedChannelByGuildKey(
	channel: ChannelTypes | Nullish,
): channel is GuildTextBasedChannelTypes {
	return Reflect.has(channel ?? {}, "guild");
}

/** Check whether a given channel is a {@link NewsChannel}. This checks for {@link ChannelType.GuildAnnouncement}. */
export function isNewsChannel(
	channel: ChannelTypes | Nullish,
): channel is NewsChannel {
	return channel?.type === ChannelType.GuildAnnouncement;
}

/** Check whether a given channel is a {@link TextChannel}. This checks for {@link ChannelType.GuildText}. */
export function isTextChannel(
	channel: ChannelTypes | Nullish,
): channel is TextChannel {
	return channel?.type === ChannelType.GuildText;
}

/** Check whether a given channel is a {@link VoiceChannel} This checks for {@link ChannelType.GuildVoice}. */
export function isVoiceChannel(
	channel: ChannelTypes | Nullish,
): channel is VoiceChannel {
	return channel?.type === ChannelType.GuildVoice;
}

/** Check whether a given channel is a {@link StageChannel} This checks for {@link ChannelType.GuildStageVoice}. */
export function isStageChannel(
	channel: ChannelTypes | Nullish,
): channel is StageChannel {
	return channel?.type === ChannelType.GuildStageVoice;
}

/** Check whether a given channel is a {@link ThreadChannel} This checks for {@link ChannelTypes.isThread()}. */
export function isThreadChannel(
	channel: ChannelTypes | Nullish,
): channel is ThreadChannel {
	return channel?.isThread() ?? false;
}

/** Check whether a given channel is an Announcement {@link PublicThreadChannel} This checks for {@link ChannelType.AnnouncementThread}. */
export function isNewsThreadChannel(
	channel: ChannelTypes | Nullish,
): channel is PublicThreadChannel {
	return channel?.type === ChannelType.AnnouncementThread;
}

/** Check whether a given channel is a {@link PublicThreadChannel} This checks for {@link ChannelType.PublicThread}. */
export function isPublicThreadChannel(
	channel: ChannelTypes | Nullish,
): channel is PublicThreadChannel {
	return channel?.type === ChannelType.PublicThread;
}

/** Check whether a given channel is a {@link PrivateThreadChannel} This checks for {@link ChannelType.PrivateThread}. */
export function isPrivateThreadChannel(
	channel: ChannelTypes | Nullish,
): channel is PrivateThreadChannel {
	return channel?.type === ChannelType.PrivateThread;
}

/** Check whether a given channel is a {@link TextBasedChannelTypes}. This means it has a `send` method. */
export function isTextBasedChannel(
	channel: ChannelTypes | Nullish,
): channel is Exclude<
	TextBasedChannelTypes,
	StageChannel | PartialGroupDMChannel
> {
	if (
		isNullish(channel) || //
		channel.partial ||
		isGroupChannel(channel as Channel | PartialDMChannel | Nullish) ||
		isStageChannel(channel)
	) {
		return false;
	}

	return !isNullish(
		(
			channel as Exclude<
				TextBasedChannelTypes,
				StageChannel | PartialGroupDMChannel
			>
		).send,
	);
}

/** Check whether a given channel is a {@link VoiceBasedChannel}. This checks for {@link Channel.isVoiceBased()}. */
export function isVoiceBasedChannel(
	channel: Channel | Nullish,
): channel is VoiceBasedChannel {
	if (isNullish(channel)) return false;

	return channel.isVoiceBased();
}

/** Check whether a given channel allows NSFW content or not  For the following channel types this is always false: - {@link ChannelType.DM} - {@link ChannelType.GroupDM} - {@link ChannelType.GuildCategory} - {@link. */
export function isNsfwChannel(channel: ChannelTypes | Nullish): boolean {
	if (isNullish(channel)) return false;

	switch (channel.type) {
		case ChannelType.DM:
		case ChannelType.GroupDM:
		case ChannelType.GuildCategory:
		case ChannelType.GuildStageVoice:
		case ChannelType.GuildVoice:
		case ChannelType.GuildDirectory:
			return false;
		case ChannelType.GuildAnnouncement:
		case ChannelType.GuildText:
		case ChannelType.GuildForum:
		case ChannelType.GuildMedia:
			return (
				channel as Exclude<
					NonThreadGuildTextBasedChannelTypes,
					VoiceChannel | StageChannel
				>
			).nsfw;
		case ChannelType.AnnouncementThread:
		case ChannelType.PrivateThread:
		case ChannelType.PublicThread:
			return Boolean((channel as ThreadChannel).parent?.nsfw);
	}
}

/** Check whether a given message is an instance of {@link Message}, and not {@link APIMessage} */
export function isMessageInstance(
	message: APIMessage | Message,
): message is Message {
	return message instanceof Message;
}

/** Check for an interaction other than autocomplete. */
export function isAnyInteraction(
	messageOrInteraction: APIMessage | Message | BaseInteraction,
): messageOrInteraction is BaseInteraction {
	return messageOrInteraction instanceof BaseInteraction;
}

/** Check for an interaction other than autocomplete. */
export function isAnyInteractableInteraction(
	messageOrInteraction: APIMessage | Message | BaseInteraction,
): messageOrInteraction is AnyInteractableInteraction {
	if (isAnyInteraction(messageOrInteraction)) {
		return !messageOrInteraction.isAutocomplete();
	}

	return false;
}

/** Check whether a given member is an instance of {@link GuildMember}, and not {@link APIInteractionGuildMember}, {@link APIGuildMember}, or {@link Nullish} */
export function isGuildMember(
	member:
		| GuildMember
		| APIGuildMember
		| APIInteractionGuildMember
		| APIInteractionDataResolvedGuildMember
		| Nullish,
): member is GuildMember {
	return member instanceof GuildMember;
}

/** Check for an image, audio, or video content type. */
export function isMediaAttachment(attachment: Attachment): boolean {
	if (isNullishOrEmpty(attachment.contentType)) return false;

	// If the attachment is an audio attachment, return true:
	if (attachment.contentType.startsWith("audio/")) return true;

	// If the attachment is an image or video attachment, return true if it has dimensions defined:
	return attachment.contentType.startsWith("image/") ||
		attachment.contentType.startsWith("video/") //
		? hasDimensionsDefined(attachment)
		: false;
}

/** Check for an image content type with known dimensions. */
export function isImageAttachment(attachment: Attachment): boolean {
	return (
		// A content type is required for an image attachment:
		!isNullishOrEmpty(attachment.contentType) && //
		// An image attachment must have a content type starting with 'image/':
		attachment.contentType.startsWith("image/") &&
		// An image attachment must have dimensions defined:
		hasDimensionsDefined(attachment)
	);
}

/** @internal - function used by {@link isImageAttachment} and {@link isMediaAttachment} */
function hasDimensionsDefined(attachment: Attachment): boolean {
	return (
		!isNullishOrZero(attachment.width) && !isNullishOrZero(attachment.height)
	);
}
