import type {
	ChatInputCommandInteraction,
	ContextMenuCommandInteraction,
	Message,
} from "discord.js";
import { Command } from "../../Command";
import { Identifiers } from "../../errors/Identifiers";
import type {
	ChatInputCommand,
	ContextMenuCommand,
	MessageCommand,
} from "../../types";
import { AllFlowsPrecondition, type Preconditions } from "../Precondition";

export interface RunInPreconditionContext
	extends AllFlowsPrecondition.RunContext {
	types?: Preconditions["RunIn"]["types"];
}

export class RunInCheck extends AllFlowsPrecondition {
	public override messageRun(
		message: Message<boolean>,
		_: MessageCommand,
		context: RunInPreconditionContext,
	): AllFlowsPrecondition.Result {
		const commandType = "message";
		if (!context.types) return this.ok();

		const channelType = message.channel.type;

		if (Command.runInTypeIsSpecificsObject(context.types)) {
			return context.types.messageRun.includes(channelType)
				? this.ok()
				: this.makeSharedError(context, commandType);
		}

		return context.types.includes(channelType)
			? this.ok()
			: this.makeSharedError(context, commandType);
	}

	public override async chatInputRun(
		interaction: ChatInputCommandInteraction,
		_: ChatInputCommand,
		context: RunInPreconditionContext,
	): AllFlowsPrecondition.AsyncResult {
		const commandType = "chat input";
		if (!context.types) return this.ok();

		const channelType = (await this.fetchChannelFromInteraction(interaction))
			.type;

		if (Command.runInTypeIsSpecificsObject(context.types)) {
			return context.types.chatInputRun.includes(channelType)
				? this.ok()
				: this.makeSharedError(context, commandType);
		}

		return context.types.includes(channelType)
			? this.ok()
			: this.makeSharedError(context, commandType);
	}

	public override async contextMenuRun(
		interaction: ContextMenuCommandInteraction,
		_: ContextMenuCommand,
		context: RunInPreconditionContext,
	): AllFlowsPrecondition.AsyncResult {
		const commandType = "context menu";
		if (!context.types) return this.ok();

		const channelType = (await this.fetchChannelFromInteraction(interaction))
			.type;

		if (Command.runInTypeIsSpecificsObject(context.types)) {
			return context.types.contextMenuRun.includes(channelType)
				? this.ok()
				: this.makeSharedError(context, commandType);
		}

		return context.types.includes(channelType)
			? this.ok()
			: this.makeSharedError(context, commandType);
	}

	private makeSharedError(
		context: RunInPreconditionContext,
		commandType: string,
	): AllFlowsPrecondition.Result {
		return this.error({
			identifier: Identifiers.PreconditionRunIn,
			message: `You cannot run this ${commandType} command in this type of channel.`,
			context: { types: context.types },
		});
	}
}
