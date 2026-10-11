import { Message, PermissionFlagsBits, PermissionsBitField } from 'discord.js';
import { Events } from '../../../events/events';
import { Listener } from '../../../events/listener';
import { type GuildBasedChannelTypes, isDMChannel } from '../../../utilities/discord/index';
import { PatternCommandEvents } from '../events';
import type { PatternCommandStore } from '../PatternCommandStore';
import type { PossiblePatternCommand } from '../types';

export class MessageParseListener extends Listener<typeof Events.PreMessageParsed> {
	private readonly requiredPermissions = new PermissionsBitField([
		PermissionFlagsBits.ViewChannel,
		PermissionFlagsBits.SendMessages
	]).freeze();
	public constructor(context: Listener.Context) {
		super(context, { event: Events.PreMessageParsed });
	}

	public override async run(message: Message) {
		const canRun = await this.canRunInChannel(message);
		if (!canRun) return;

		let { content } = message;
		const { client, modules } = this.container;

		const patternCommandStore = modules.require('patterns') as PatternCommandStore | undefined;

		if (!patternCommandStore) {
			return;
		}

		if (client.options.caseInsensitiveCommands) {
			content = content.toLowerCase();
		}

		const possiblePatternCommands: PossiblePatternCommand[] = [];

		for (const [key, patternCommand] of patternCommandStore) {
			if (content === key) {
				possiblePatternCommands.push({
					command: patternCommand,
					alias: key,
					weight: patternCommand.weight
				});
				continue;
			}

			const aliasMatch = patternCommand.aliases.find((alias) => alias === content);

			if (aliasMatch) {
				possiblePatternCommands.push({
					command: patternCommand,
					alias: aliasMatch,
					weight: patternCommand.weight
				});
				continue;
			}

			if (
				content.match(
					new RegExp(patternCommand.matchFullName ? `\b${key}\b` : key, client.options.caseInsensitiveCommands ? 'i' : undefined)
				)
			) {
				possiblePatternCommands.push({
					command: patternCommand,
					alias: content,
					weight: patternCommand.weight
				});
				continue;
			}

			const aliasRegexMatch = patternCommand.aliases.find((alias) =>
				content.match(new RegExp(alias, client.options.caseInsensitiveCommands ? 'i' : undefined))
			);

			if (aliasRegexMatch) {
				possiblePatternCommands.push({
					command: patternCommand,
					alias: aliasRegexMatch,
					weight: patternCommand.weight
				});
			}
		}

		if (possiblePatternCommands.length > 0) {
			const sortedPossiblePatternCommands = possiblePatternCommands.sort((first, second) => {
				return second.weight - first.weight;
			});

			client.emit(PatternCommandEvents.PreCommandRun, { message, possibleCommands: sortedPossiblePatternCommands });
		}
	}

	private async canRunInChannel(message: Message): Promise<boolean> {
		if (isDMChannel(message.channel)) return true;

		const me = await message.guild?.members.fetchMe();
		if (!me) return false;

		const channel = message.channel as GuildBasedChannelTypes;
		return channel.permissionsFor(me).has(this.requiredPermissions, false);
	}
}
