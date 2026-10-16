import type {
	ActionRowComponentOptions,
	ActionRowData,
	APIActionRowComponent,
	APIComponentInMessageActionRow,
	APIEmbed,
	APIMessage,
	BaseMessageOptions,
	ButtonInteraction,
	ChannelSelectMenuComponentData,
	CollectedInteraction,
	CommandInteraction,
	EmbedBuilder,
	InteractionButtonComponentData,
	InteractionCollector,
	InteractionReplyOptions,
	InteractionUpdateOptions,
	JSONEncodable,
	LinkButtonComponentData,
	MentionableSelectMenuComponentData,
	Message,
	MessageActionRowComponentBuilder,
	MessageComponentInteraction,
	MessageEditOptions,
	MessageReplyOptions,
	ModalSubmitInteraction,
	RoleSelectMenuComponentData,
	SelectMenuComponentOptionData,
	StringSelectMenuComponentData,
	User,
	UserSelectMenuComponentData,
	WebhookMessageEditOptions,
} from "discord.js";
import type { InternationalizationContext } from "../../../extensions/localisation/types";
import type { Awaitable } from "../../index";
import type { AnyInteractableInteraction } from "../utility-types";
import type { PaginatedMessage } from "./PaginatedMessage";

/** An action that can be performed in a paginated message. */
export type PaginatedMessageAction =
	| PaginatedMessageActionButton
	| PaginatedMessageActionLink
	| PaginatedMessageActionStringMenu
	| PaginatedMessageActionUserMenu
	| PaginatedMessageActionRoleMenu
	| PaginatedMessageActionMentionableMenu
	| PaginatedMessageActionChannelMenu;

/** An action that can be run in a paginated message. */
export interface PaginatedMessageActionRun {
	/** Runs the action with the given context. */
	run?(context: PaginatedMessageActionContext): Awaitable<unknown>;
}

/** To utilize buttons you can pass an object with the structure of {@link PaginatedMessageActionButton} to {@link PaginatedMessage} actions. */
export type PaginatedMessageActionButton = InteractionButtonComponentData &
	PaginatedMessageActionRun;

/** To utilize links you can pass an object with the structure of {@link PaginatedMessageActionLink} to {@link PaginatedMessage} actions. */
export type PaginatedMessageActionLink = LinkButtonComponentData;

/** To utilize String Select Menus you can pass an object with the structure of {@link PaginatedMessageActionStringMenu} to {@link PaginatedMessage} actions. */
export type PaginatedMessageActionStringMenu = PaginatedMessageActionRun &
	StringSelectMenuComponentData;

/** To utilize User Select Menus you can pass an object with the structure of {@link PaginatedMessageActionUserMenu} to {@link PaginatedMessage} actions. */
export type PaginatedMessageActionUserMenu = PaginatedMessageActionRun &
	UserSelectMenuComponentData & {
		options?: never;
	};

/** To utilize Role Select Menus you can pass an object with the structure of {@link PaginatedMessageActionRoleMenu} to {@link PaginatedMessage} actions. */
export type PaginatedMessageActionRoleMenu = PaginatedMessageActionRun &
	RoleSelectMenuComponentData & {
		options?: never;
	};

/** To utilize Mentionable Select Menus you can pass an object with the structure of {@link PaginatedMessageActionMentionableMenu} to {@link PaginatedMessage} actions. */
export type PaginatedMessageActionMentionableMenu = PaginatedMessageActionRun &
	MentionableSelectMenuComponentData & {
		options?: never;
	};

/** To utilize Channel Select Menus you can pass an object with the structure of {@link PaginatedMessageActionChannelMenu} to {@link PaginatedMessage} actions. */
export type PaginatedMessageActionChannelMenu = PaginatedMessageActionRun &
	ChannelSelectMenuComponentData & {
		options?: never;
	};

/** The context to be used in {@link PaginatedMessageActionButton}. */
export interface PaginatedMessageActionContext {
	interaction: PaginatedMessageInteractionUnion;
	handler: PaginatedMessage;
	author: User;
	channel: Message["channel"];
	response:
		| APIMessage
		| Message
		| CommandInteraction
		| ButtonInteraction
		| PaginatedMessageInteractionUnion;
	collector: InteractionCollector<PaginatedMessageInteractionUnion>;
}

/** Options for configuring a paginated message. */
export interface PaginatedMessageOptions {
	/** The pages to display in this {@link PaginatedMessage}. */
	pages?: PaginatedMessagePage[];

	/** Custom actions to provide when sending the paginated message. */
	actions?: PaginatedMessageAction[];

	/** The {@link EmbedBuilder} or {@link MessageOptions} options to apply to the entire {@link PaginatedMessage}. */
	template?: EmbedBuilder | BaseMessageOptions;

	/** The prefix to display before the page index. @seealso {@link PaginatedMessage.pageIndexPrefix} */
	pageIndexPrefix?: string;

	/** The separator to display between the embed footer and the page index. @seealso {@link PaginatedMessage.embedFooterSeparator} */
	embedFooterSeparator?: string;

	/** Additional options that are applied to each message when sending it to Discord. Be careful with using this, misusing it can cause issues, such as sending empty messages.
	 * @default null */
	paginatedMessageData?: Omit<
		PaginatedMessageMessageOptionsUnion,
		"components"
	> | null;
}

/** The pages that are used for {@link PaginatedMessage.pages}  Pages can be either a {@link Message}, or an {@link Awaitable} function that returns a {@link Message}. */
export type PaginatedMessagePage =
	| ((
			index: number,
			pages: PaginatedMessagePage[],
			handler: PaginatedMessage,
	  ) => Awaitable<PaginatedMessageMessageOptionsUnion>)
	| PaginatedMessageMessageOptionsUnion;

/** A resolved page for a paginated message. It can be either a `BaseMessageOptions` object with the `flags` property omitted, or a `WebhookMessageEditOptions` object. */
export type PaginatedMessageResolvedPage =
	Omit<BaseMessageOptions, "flags"> | Omit<WebhookMessageEditOptions, "flags">;

/** The type of the custom function that can be set for the {@link PaginatedMessage.selectMenuOptions} */
export type PaginatedMessageSelectMenuOptionsFunction = (
	pageIndex: number,
	internationalizationContext: PaginatedMessageInternationalizationContext,
) => Awaitable<Omit<SelectMenuComponentOptionData, "value">>;

/** The type of the custom function that can be set for the {@link PaginatedMessage.wrongUserInteractionReply} */
export type PaginatedMessageWrongUserInteractionReplyFunction = (
	targetUser: User,
	interactionUser: User,
	internationalizationContext: PaginatedMessageInternationalizationContext,
) => Awaitable<Parameters<MessageComponentInteraction["reply"]>[0]>;

/** The resolvable type for the embeds property of a paginated message. */
export type PaginatedMessageEmbedResolvable = BaseMessageOptions["embeds"];

/** A non nullable writeable variant of {@link PaginatedMessageEmbedResolvable}. This removes:  - The union with `| undefined` - The `readonly` constraint */
export type PaginatedMessageWriteableEmbedResolvable = (
	APIEmbed | JSONEncodable<APIEmbed>
)[];

/** The union of options for a paginated message. */
export type PaginatedMessageMessageOptionsUnion = Omit<
	PaginatedMessageResolvedPage,
	"components"
> & {
	actions?: PaginatedMessageAction[];
};

/** The union type of interactions for a paginated message, excluding the ModalSubmitInteraction. */
export type PaginatedMessageInteractionUnion = Exclude<
	CollectedInteraction,
	ModalSubmitInteraction
>;

/** A union type for components in a paginated message. */
export type PaginatedMessageComponentUnion =
	| JSONEncodable<APIActionRowComponent<APIComponentInMessageActionRow>>
	| ActionRowData<ActionRowComponentOptions | MessageActionRowComponentBuilder>
	| APIActionRowComponent<APIComponentInMessageActionRow>;

/** Locale context shared with the localization feature. */
export type PaginatedMessageInternationalizationContext =
	InternationalizationContext;

/** The parameters for safely replying to an interaction. @template T - The type of message method ('edit', 'reply', or never). */
export interface SafeReplyToInteractionParameters<
	T extends "edit" | "reply" = never,
> {
	/** The message or interaction to reply to. */
	messageOrInteraction: APIMessage | Message | AnyInteractableInteraction;

	/** The content to use when editing a reply to an interaction. */
	interactionEditReplyContent: WebhookMessageEditOptions;

	/** The content to use when replying to an interaction. */
	interactionReplyContent: InteractionReplyOptions;

	/** The content to use when updating a component interaction. */
	componentUpdateContent: InteractionUpdateOptions;

	/** The method to use when sending a message. */
	messageMethod?: T;

	/** The content to use when sending a message using the 'reply' method. */
	messageMethodContent?: T extends "reply"
		? MessageReplyOptions
		: MessageEditOptions;
}

/** The possible reasons for stopping a paginated message. */
export type PaginatedMessageStopReasons =
	| "time"
	| "idle"
	| "user"
	| "messageDelete"
	| "channelDelete"
	| "threadDelete"
	| "guildDelete"
	| "limit"
	| "componentLimit"
	| "userLimit";

/** A resolvable object that can be used to create an embed in Discord. It can be either a JSON-encodable object or an APIEmbed object. */
export type EmbedResolvable = JSONEncodable<APIEmbed> | APIEmbed;
