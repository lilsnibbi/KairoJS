import type { Awaitable, Message } from "discord.js";
import { Args } from "../../commands/arguments/Args";
import { Command } from "../../commands/Command";
import { type MessageCommand } from "../../commands/types";

export abstract class PatternCommand extends Command<
	Args,
	PatternCommand.Options
> {
	public static override readonly options?: PatternCommand.Options;
	public readonly chance: number;
	public readonly weight: number;
	public readonly matchFullName: boolean;
	public constructor(
		context: PatternCommand.Context,
		options: PatternCommand.Options,
	) {
		super(context, options);
		this.chance = options.chance ?? 100;
		if (options.weight) {
			if (options.weight < 0) {
				this.weight = 0;
			} else if (options.weight > 10) {
				this.weight = 10;
			} else {
				this.weight = options.weight;
			}
		} else {
			this.weight = 5;
		}
		this.matchFullName = options.matchFullName ?? false;
	}

	/** Run the pattern command's logic. */
	public abstract override messageRun(message: Message): Awaitable<unknown>;
}

export interface PatternCommandOptions extends MessageCommand.Options {
	/** The chance that the pattern command is triggered.
	 * @default 100 */
	chance?: number;
	/** The matching weight of the command.
	 * @default 5 */
	weight?: number;
	/** If true it will only trigger on full matches (for example, explore won't trigger lore) Note: It will only change the behavior of the command's name and not for the command's aliasses
	 * @default false */
	matchFullName?: boolean;
}

export namespace PatternCommand {
	export type Context = MessageCommand.Context;

	/** Re-export of {@link MessageCommand.RunContext} */
	export type RunContext = MessageCommand.RunContext;

	/** Re-export of {@link MessageCommand.JSON} */
	export type JSON = MessageCommand.JSON;

	/** Re-export of {@link MessageCommand.RunInTypes} */
	export type RunInTypes = MessageCommand.RunInTypes;

	/** The PatternCommand Options */
	export type Options = PatternCommandOptions;
}
