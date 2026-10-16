import {
	PermissionFlagsBits,
	PermissionsBitField,
	type VoiceBasedChannel,
} from "discord.js";
import { isNullish, type Nullish } from "../index";
import {
	isDMChannel,
	isGuildBasedChannel,
	isVoiceBasedChannel,
} from "./type-guards";
import type { ChannelTypes } from "./utility-types";

const canReadMessagesPermissions = new PermissionsBitField([
	PermissionFlagsBits.ViewChannel,
]);

/** Check whether we can read messages in a given channel. */
export function canReadMessages(channel: ChannelTypes | Nullish): boolean {
	if (isNullish(channel)) return false;
	if (isDMChannel(channel)) return true;

	return canDoUtility(channel, canReadMessagesPermissions);
}

const canSendMessagesPermissions = new PermissionsBitField([
	canReadMessagesPermissions,
	PermissionFlagsBits.SendMessages,
]);

/** Check whether we can send messages in a given channel. */
export function canSendMessages(channel: ChannelTypes | Nullish): boolean {
	if (isNullish(channel)) return false;
	if (isDMChannel(channel)) return true;
	if (channel.isThread() && !channel.sendable) return false;

	return canDoUtility(channel, canSendMessagesPermissions);
}

const canSendEmbedsPermissions = new PermissionsBitField([
	canSendMessagesPermissions,
	PermissionFlagsBits.EmbedLinks,
]);

/** Check whether we can send embeds in a given channel. */
export function canSendEmbeds(channel: ChannelTypes | Nullish): boolean {
	if (isNullish(channel)) return false;
	if (isDMChannel(channel)) return true;
	if (channel.isThread() && !channel.sendable) return false;

	return canDoUtility(channel, canSendEmbedsPermissions);
}

const canSendAttachmentsPermissions = new PermissionsBitField([
	canSendMessagesPermissions,
	PermissionFlagsBits.AttachFiles,
]);

/** Check whether we can send attachments in a given channel. */
export function canSendAttachments(channel: ChannelTypes | Nullish): boolean {
	if (isNullish(channel)) return false;
	if (isDMChannel(channel)) return true;
	if (channel.isThread() && !channel.sendable) return false;

	return canDoUtility(channel, canSendAttachmentsPermissions);
}

const canReactPermissions = new PermissionsBitField([
	canSendMessagesPermissions,
	PermissionFlagsBits.ReadMessageHistory,
	PermissionFlagsBits.AddReactions,
]);

/** Check whether we can send react to messages in a given channel. */
export function canReact(channel: ChannelTypes | Nullish) {
	if (isNullish(channel)) return false;
	if (isDMChannel(channel)) return true;
	if (channel.isThread() && channel.archived) return false;

	return canDoUtility(channel, canReactPermissions);
}

const canRemoveAllReactionsPermissions = new PermissionsBitField([
	canReadMessagesPermissions,
	PermissionFlagsBits.ReadMessageHistory,
	PermissionFlagsBits.ManageMessages,
]);

/** Check whether we can remove reactions from messages in a given channel. */
export function canRemoveAllReactions(channel: ChannelTypes | Nullish) {
	if (isNullish(channel)) return false;
	if (isDMChannel(channel)) return false;

	return canDoUtility(channel, canRemoveAllReactionsPermissions);
}

const canJoinVoiceChannelPermissions = new PermissionsBitField([
	PermissionFlagsBits.Connect,
]);

/** Check whether the client can join the given voice based channel. */
export function canJoinVoiceChannel(
	channel: VoiceBasedChannel | Nullish,
): boolean {
	if (isNullish(channel)) return false;
	if (!isVoiceBasedChannel(channel)) return false;
	if (channel.userLimit >= channel.members.size) return false;

	return canDoUtility(channel, canJoinVoiceChannelPermissions);
}

function canDoUtility(
	channel: ChannelTypes,
	permissionsToPass: PermissionsBitField,
) {
	if (!isGuildBasedChannel(channel)) {
		return true;
	}

	const { me } = channel.guild.members;
	if (!me) return false;

	const permissionsFor = channel.permissionsFor(me);
	if (!permissionsFor) return false;

	return permissionsFor.has(permissionsToPass);
}
