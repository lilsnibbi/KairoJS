import type {
	ChatInputCommandInteraction,
	ContextMenuCommandInteraction,
	Message,
} from "discord.js";
import type { Command } from "../../Command";
import { Identifiers } from "../../errors/Identifiers";
import { AllFlowsPrecondition } from "../Precondition";

export class EnabledCheck extends AllFlowsPrecondition {
	public constructor(context: AllFlowsPrecondition.Context) {
		super(context, { position: 10 });
	}

	public messageRun(
		_: Message,
		command: Command,
		context: AllFlowsPrecondition.RunContext,
	): AllFlowsPrecondition.Result {
		return command.enabled
			? this.ok()
			: this.error({
					identifier: Identifiers.CommandDisabled,
					message: "This message command is disabled.",
					context,
				});
	}

	public chatInputRun(
		_: ChatInputCommandInteraction,
		command: Command,
		context: AllFlowsPrecondition.RunContext,
	): AllFlowsPrecondition.Result {
		return command.enabled
			? this.ok()
			: this.error({
					identifier: Identifiers.CommandDisabled,
					message: "This chat input command is disabled.",
					context,
				});
	}

	public contextMenuRun(
		_: ContextMenuCommandInteraction,
		command: Command,
		context: AllFlowsPrecondition.RunContext,
	): AllFlowsPrecondition.Result {
		return command.enabled
			? this.ok()
			: this.error({
					identifier: Identifiers.CommandDisabled,
					message: "This context menu command is disabled.",
					context,
				});
	}
}
