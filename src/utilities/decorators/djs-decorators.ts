import { type BaseInteraction, type Message, PermissionFlagsBits, type PermissionResolvable, PermissionsBitField } from 'discord.js';
import { UserError } from '../../commands/errors/UserError';
import { isDMChannel, isGuildBasedChannel } from '../discord/index';
import { isNullish } from '../index';
import { createFunctionPrecondition, type FunctionFallback } from './utils';

export enum DecoratorIdentifiers {
	RequiresClientPermissionsGuildOnly = 'requiresClientPermissionsGuildOnly',
	RequiresClientPermissionsMissingPermissions = 'requiresClientPermissionsMissingPermissions',
	RequiresUserPermissionsGuildOnly = 'requiresUserPermissionsGuildOnly',
	RequiresUserPermissionsMissingPermissions = 'requiresUserPermissionsMissingPermissions'
}

const DMAvailablePermissions = new PermissionsBitField(
	~new PermissionsBitField([
		//
		PermissionFlagsBits.AddReactions,
		PermissionFlagsBits.AttachFiles,
		PermissionFlagsBits.EmbedLinks,
		PermissionFlagsBits.ReadMessageHistory,
		PermissionFlagsBits.SendMessages,
		PermissionFlagsBits.UseExternalEmojis,
		PermissionFlagsBits.ViewChannel
	]).bitfield & PermissionsBitField.All
);

const DMAvailableUserPermissions = new PermissionsBitField(
	~new PermissionsBitField([
		PermissionFlagsBits.AddReactions,
		PermissionFlagsBits.AttachFiles,
		PermissionFlagsBits.EmbedLinks,
		PermissionFlagsBits.ReadMessageHistory,
		PermissionFlagsBits.SendMessages,
		PermissionFlagsBits.UseExternalEmojis,
		PermissionFlagsBits.ViewChannel,
		PermissionFlagsBits.UseExternalStickers,
		PermissionFlagsBits.MentionEveryone
	]).bitfield & PermissionsBitField.All
);

/** Allows you to set permissions required for individual methods. This is particularly useful for subcommands that require specific permissions. */
export const RequiresClientPermissions = (...permissionsResolvable: PermissionResolvable[]): MethodDecorator => {
	const resolved = new PermissionsBitField(permissionsResolvable);
	const resolvedIncludesServerPermissions = Boolean(resolved.bitfield & DMAvailablePermissions.bitfield);

	return createFunctionPrecondition((context: Message | BaseInteraction) => {
		const { channel } = context;
		const member = context.guild?.members.me;

		if (resolvedIncludesServerPermissions && isDMChannel(channel)) {
			throw new UserError({
				identifier: DecoratorIdentifiers.RequiresClientPermissionsGuildOnly,
				message: 'Sorry, but that command can only be used in a server because I do not have sufficient permissions in DMs'
			});
		}

		if (isGuildBasedChannel(channel) && !isNullish(member)) {
			const missingPermissions = channel.permissionsFor(member).missing(resolved);

			if (missingPermissions.length) {
				throw new UserError({
					identifier: DecoratorIdentifiers.RequiresClientPermissionsMissingPermissions,
					message: `Sorry, but I am not allowed to do that. I am missing the permissions: ${missingPermissions}`,
					context: {
						missing: missingPermissions
					}
				});
			}
		}

		return true;
	});
};

/** Allows you to set permissions required for individual methods. This is particularly useful for subcommands that require specific permissions. */
export const RequiresUserPermissions = (...permissionsResolvable: PermissionResolvable[]): MethodDecorator => {
	const resolved = new PermissionsBitField(permissionsResolvable);
	const resolvedIncludesServerPermissions = Boolean(resolved.bitfield & DMAvailableUserPermissions.bitfield);

	return createFunctionPrecondition((context: Message | BaseInteraction) => {
		const { channel } = context;
		const member = context.guild?.members.me;

		if (resolvedIncludesServerPermissions && isDMChannel(channel)) {
			throw new UserError({
				identifier: DecoratorIdentifiers.RequiresUserPermissionsGuildOnly,
				message: 'Sorry, but that command can only be used in a server because you do not have sufficient permissions in DMs'
			});
		}

		if (isGuildBasedChannel(channel) && !isNullish(member)) {
			const missingPermissions = channel.permissionsFor(member).missing(resolved);

			if (missingPermissions.length) {
				throw new UserError({
					identifier: DecoratorIdentifiers.RequiresUserPermissionsMissingPermissions,
					message: `Sorry, but you are not allowed to do that. You are missing the permissions: ${missingPermissions}`,
					context: {
						missing: missingPermissions
					}
				});
			}
		}

		return true;
	});
};

/** Requires the message to be run in a guild context, this decorator requires the first argument to be a {@link Message} or {@link BaseInteraction} instance which includes all interaction types */
export function RequiresGuildContext(fallback: FunctionFallback = (): void => undefined): MethodDecorator {
	return createFunctionPrecondition((context: Message | BaseInteraction) => context.guild !== null, fallback);
}

/** Requires the message to be run in a dm context, this decorator requires the first argument to be a {@link Message} or {@link BaseInteraction} instance which includes all interaction types */
export function RequiresDMContext(fallback: FunctionFallback = (): void => undefined): MethodDecorator {
	return createFunctionPrecondition((context: Message | BaseInteraction) => context.guild === null, fallback);
}
