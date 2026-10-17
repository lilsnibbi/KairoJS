import type {
	CollectorFilter,
	CollectorOptions,
	Message,
	User,
} from "discord.js";
import { type ArgumentTypes, isNullish } from "../../../index";
import { isStageChannel, isTextBasedChannel } from "../../type-guards";
import type {
	MessagePrompterChannelTypes,
	MessagePrompterMessage,
} from "../constants";
import type { IMessagePrompterExplicitMessageReturn } from "../ExplicitReturnTypes";
import type { IMessagePrompterStrategyOptions } from "../strategyOptions";
import { MessagePrompterBaseStrategy } from "./MessagePrompterBaseStrategy";

/** Prompt strategy that waits for a message response. Timeout and Discord failures reject. */
export class MessagePrompterMessageStrategy
	extends MessagePrompterBaseStrategy
	implements IMessagePrompterStrategyOptions
{
	/** Constructor for the {@link MessagePrompterBaseStrategy} class */
	public constructor(
		message: MessagePrompterMessage,
		options: IMessagePrompterStrategyOptions,
	) {
		super("message", message, options);
	}

	/** This executes the {@link MessagePrompter} and sends the message if {@link IMessagePrompterOptions.type} equals message. The handler will wait for one (1) message. */
	public override async run(
		channel: MessagePrompterChannelTypes,
		authorOrFilter: User | CollectorFilter<[Message]>,
	): Promise<IMessagePrompterExplicitMessageReturn | Message> {
		if (isTextBasedChannel(channel) && !isStageChannel(channel)) {
			if (!isNullish(this.editMessage) && this.editMessage.editable) {
				this.appliedMessage = await this.editMessage.edit(
					this.message as ArgumentTypes<Message["edit"]>[0],
				);
			} else {
				this.appliedMessage = await channel.send(this.message);
			}

			const collector = await channel.awaitMessages({
				...this.createMessagePromptFilter(authorOrFilter),
				max: 1,
				time: this.timeout,
				errors: ["time"],
			});
			const response = collector.first();

			if (!response) {
				throw new Error("No messages received");
			}

			return this.explicitReturn
				? {
						response,
						strategy: this,
						appliedMessage: this.appliedMessage,
						message: this.message,
					}
				: response;
		}

		throw new Error(
			"A channel was provided to which I am not able to send messages",
		);
	}

	/** Create a filter for the collector to filter on */
	private createMessagePromptFilter(
		authorOrFilter: User | CollectorFilter<[Message]>,
	): CollectorOptions<[Message]> {
		return {
			filter: async (message: Message) =>
				(typeof authorOrFilter === "function"
					? await authorOrFilter(message)
					: message.author.id === authorOrFilter.id) && !message.author.bot,
		};
	}
}
