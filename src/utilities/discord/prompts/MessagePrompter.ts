import type { CollectorFilter, EmojiResolvable, Message, MessageReaction, User } from 'discord.js';
import type { Ctor } from '../../index';
import type { MessagePrompterChannelTypes, MessagePrompterMessage } from './constants';
import type {
	IMessagePrompterExplicitConfirmReturn,
	IMessagePrompterExplicitMessageReturn,
	IMessagePrompterExplicitNumberReturn,
	IMessagePrompterExplicitReturnBase
} from './ExplicitReturnTypes';
import { MessagePrompterBaseStrategy } from './strategies/MessagePrompterBaseStrategy';
import { MessagePrompterConfirmStrategy } from './strategies/MessagePrompterConfirmStrategy';
import { MessagePrompterMessageStrategy } from './strategies/MessagePrompterMessageStrategy';
import { MessagePrompterNumberStrategy } from './strategies/MessagePrompterNumberStrategy';
import { MessagePrompterReactionStrategy } from './strategies/MessagePrompterReactionStrategy';
import type {
	IMessagePrompterConfirmStrategyOptions,
	IMessagePrompterNumberStrategyOptions,
	IMessagePrompterReactionStrategyOptions,
	IMessagePrompterStrategyOptions
} from './strategyOptions';

export interface StrategyReturns {
	confirm: IMessagePrompterExplicitConfirmReturn | boolean;
	message: IMessagePrompterExplicitMessageReturn | Message;
	number: IMessagePrompterExplicitNumberReturn | number;
	reaction: IMessagePrompterExplicitReturnBase | string | EmojiResolvable;
}

export interface StrategyOptions {
	confirm: IMessagePrompterConfirmStrategyOptions;
	message: IMessagePrompterStrategyOptions;
	number: IMessagePrompterNumberStrategyOptions;
	reaction: IMessagePrompterReactionStrategyOptions;
}

export interface StrategyFilters {
	confirm: [MessageReaction, User];
	message: [Message];
	number: [MessageReaction, User];
	reaction: [MessageReaction, User];
}

/** This is a {@link MessagePrompter}, a utility that sends a message, prompting for user input. */
export class MessagePrompter<S extends keyof StrategyReturns = 'confirm'> {
	/** The strategy used in {@link MessagePrompter.run} */
	public strategy: MessagePrompterBaseStrategy;

	/** Constructor for the {@link MessagePrompter} class */
	public constructor(
		message: MessagePrompterMessage | MessagePrompterBaseStrategy,
		strategy?: S,
		strategyOptions?: S extends keyof StrategyOptions ? StrategyOptions[S] : never
	) {
		let strategyToRun: MessagePrompterBaseStrategy;

		if (message instanceof MessagePrompterBaseStrategy) {
			strategyToRun = message;
		} else {
			const mapStrategy = MessagePrompter.strategies.get(strategy ?? MessagePrompter.defaultStrategy);

			if (!mapStrategy) {
				throw new Error('No strategy provided');
			}

			strategyToRun = new mapStrategy(message, strategyOptions);
		}

		this.strategy = strategyToRun;
	}

	/** This executes the {@link MessagePrompter} and sends the message. */
	public run<Filter extends S extends keyof StrategyFilters ? StrategyFilters[S] : unknown[]>(
		channel: MessagePrompterChannelTypes,
		authorOrFilter: User | CollectorFilter<Filter>
	): S extends keyof StrategyReturns ? Promise<StrategyReturns[S]> : never {
		return this.strategy.run(channel, authorOrFilter as User | CollectorFilter<unknown[]>) as S extends keyof StrategyReturns
			? Promise<StrategyReturns[S]>
			: never;
	}

	/** The available strategies */
	public static readonly strategies: Map<
		keyof StrategyReturns,
		Ctor<
			| ConstructorParameters<typeof MessagePrompterConfirmStrategy>
			| ConstructorParameters<typeof MessagePrompterNumberStrategy>
			| ConstructorParameters<typeof MessagePrompterReactionStrategy>
			| ConstructorParameters<typeof MessagePrompterMessageStrategy>,
			MessagePrompterConfirmStrategy | MessagePrompterNumberStrategy | MessagePrompterReactionStrategy | MessagePrompterMessageStrategy
		>
		// @ts-expect-error 2322
	> = new Map([
		['confirm', MessagePrompterConfirmStrategy],
		['number', MessagePrompterNumberStrategy],
		['reaction', MessagePrompterReactionStrategy],
		['message', MessagePrompterMessageStrategy]
	]);

	/** The default strategy to use */
	public static defaultStrategy: keyof StrategyReturns = 'confirm';
}
