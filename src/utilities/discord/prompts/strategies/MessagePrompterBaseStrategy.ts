import type {
	CollectorFilter,
	CollectorOptions,
	EmojiIdentifierResolvable,
	Message,
	MessageReaction,
	User,
} from "discord.js";
import { type ArgumentTypes, type Awaitable, isNullish } from "../../../index";
import { isStageChannel, isTextBasedChannel } from "../../type-guards";
import type {
	MessagePrompterChannelTypes,
	MessagePrompterMessage,
} from "../constants";
import type { IMessagePrompterExplicitReturnBase } from "../ExplicitReturnTypes";
import type { IMessagePrompterStrategyOptions } from "../strategyOptions";

/** Base prompt strategy with timeout, explicit metadata, and reaction collection helpers. */
export abstract class MessagePrompterBaseStrategy {
	/** The type of strategy that was used */
	public type: string;

	/** The timeout that was used in the collector */
	public timeout: number;

	/** Whether to return an explicit object with data, or the strategies' default */
	public explicitReturn: boolean;

	/** The message that has been sent in {@link MessagePrompter.run} */
	public appliedMessage: Message | null = null;

	/** The message that will be sent in {@link MessagePrompter.run} */
	public message: MessagePrompterMessage;

	/** The message the bot will edit to send its prompt in {@link MessagePrompter.run} */
	public editMessage: Message | undefined;

	/** Constructor for the {@link MessagePrompterBaseStrategy} class */
	public constructor(
		type: string,
		message: MessagePrompterMessage,
		options?: IMessagePrompterStrategyOptions,
	) {
		this.type = type;
		this.timeout =
			options?.timeout ??
			MessagePrompterBaseStrategy.defaultStrategyOptions.timeout ??
			10 * 1000;
		this.explicitReturn =
			options?.explicitReturn ??
			MessagePrompterBaseStrategy.defaultStrategyOptions.explicitReturn ??
			false;
		this.editMessage =
			options?.editMessage ??
			MessagePrompterBaseStrategy.defaultStrategyOptions.editMessage ??
			undefined;
		this.message = message;
	}

	/**
	 * Send or edit a prompt and collect a response accepted by the user/filter.
	 * @param channel - Prompt channel.
	 * @param authorOrFilter - Allowed user or custom collector filter.
	 * @returns The strategy’s selected value or explicit metadata. Timeout and Discord failures reject.
	 */
	public abstract run(
		channel: MessagePrompterChannelTypes,
		authorOrFilter: User | CollectorFilter<unknown[]>,
	): Awaitable<unknown>;

	/**
	 * Send/edit the prompt, add the accepted reactions, and wait for one non-bot response.
	 * @param channel - Text-capable prompt channel.
	 * @param authorOrFilter - Allowed user or custom reaction filter.
	 * @param reactions - Accepted emoji IDs/names.
	 * @returns Prompt and reaction metadata.
	 * @throws On collector end without a response or Discord send/reaction failures.
	 */
	protected async collectReactions(
		channel: MessagePrompterChannelTypes,
		authorOrFilter: User | CollectorFilter<[MessageReaction, User]>,
		reactions: string[] | EmojiIdentifierResolvable[],
	): Promise<IMessagePrompterExplicitReturnBase> {
		if (isTextBasedChannel(channel) && !isStageChannel(channel)) {
			if (!isNullish(this.editMessage) && this.editMessage.editable) {
				this.appliedMessage = await this.editMessage.edit(
					this.message as ArgumentTypes<Message["edit"]>[0],
				);
			} else {
				this.appliedMessage = await channel.send(this.message);
			}

			const collector = this.appliedMessage.createReactionCollector({
				...this.createReactionPromptFilter(reactions, authorOrFilter),
				max: 1,
				time: this.timeout,
			});

			let resolved = false;
			const collected: Promise<MessageReaction> = new Promise<MessageReaction>(
				(resolve, reject) => {
					collector.on("collect", (r) => {
						resolve(r);
						resolved = true;
						collector.stop();
					});

					collector.on("end", (collected) => {
						resolved = true;
						if (!collected.size) reject(new Error("Collector has ended"));
					});
				},
			);

			for (const reaction of reactions) {
				if (resolved) break;

				await this.appliedMessage.react(reaction);
			}

			const firstReaction = await collected;
			const emoji = firstReaction?.emoji;

			const reaction = reactions.find((r) => (emoji?.id ?? emoji?.name) === r);

			return {
				emoji,
				reaction,
				strategy: this,
				appliedMessage: this.appliedMessage,
				message: this.message,
			};
		}

		throw new Error(
			"A channel was provided to which I am not able to send messages",
		);
	}

	/** Create a filter for the collector to filter on */
	protected createReactionPromptFilter(
		reactions: string[] | EmojiIdentifierResolvable[],
		authorOrFilter: User | CollectorFilter<[MessageReaction, User]>,
	): CollectorOptions<[MessageReaction, User]> {
		return {
			filter: async (reaction: MessageReaction, user: User) =>
				reactions.includes(reaction.emoji.id ?? reaction.emoji.name ?? "") &&
				(typeof authorOrFilter === "function"
					? await authorOrFilter(reaction, user)
					: user.id === authorOrFilter.id) &&
				!user.bot,
		};
	}

	/** The default strategy options */
	public static defaultStrategyOptions: IMessagePrompterStrategyOptions = {
		timeout: 10 * 1000,
		explicitReturn: false,
		editMessage: undefined,
	};
}
