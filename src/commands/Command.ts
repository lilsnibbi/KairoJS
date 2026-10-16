import {
	type AutocompleteInteraction,
	ChannelType,
	ChatInputCommandInteraction,
	ContextMenuCommandInteraction,
	type Message,
} from "discord.js";
import { AliasModule } from "../core/modules/index";
import {
	type Awaitable,
	isFunction,
	isNullish,
	isObject,
} from "../utilities/index";
import {
	ArgumentStream,
	type IUnorderedStrategy,
	Lexer,
	Parser,
} from "../utilities/parsing/index";
import { FlagUnorderedStrategy } from "../utilities/parsing/strategies/FlagUnorderedStrategy";
import { Args } from "./arguments/Args";
import { PreconditionContainerArray } from "./checks/containers/Group";
import {
	parseConstructorPreConditionsCooldown,
	parseConstructorPreConditionsNsfw,
	parseConstructorPreConditionsRequiredClientPermissions,
	parseConstructorPreConditionsRequiredUserPermissions,
	parseConstructorPreConditionsRunIn,
} from "./checks/resolvers/index";
import type { ApplicationCommandRegistry } from "./registration/Registry";
import { acquire } from "./registration/registries";
import type {
	AutocompleteCommand,
	ChatInputCommand,
	CommandJSON,
	CommandOptions,
	CommandOptionsRunType,
	CommandRunInUnion,
	CommandSpecificRunIn,
	ContextMenuCommand,
	DetailedDescriptionCommand,
	MessageCommand,
} from "./types";

const ChannelTypes = Object.values(ChannelType).filter(
	(type) => typeof type === "number",
) as readonly ChannelType[];
const GuildChannelTypes = ChannelTypes.filter(
	(type) => type !== ChannelType.DM && type !== ChannelType.GroupDM,
) as readonly ChannelType[];

export class Command<
	PreParseReturn = Args,
	Options extends Command.Options = Command.Options,
> extends AliasModule<Options, "commands"> {
	public static override readonly options?: Command.Options;
	/** The raw name of the command as provided through file name or constructor options. */
	public rawName: string;

	/** A basic summary about the command */
	public description: string;

	/** The preconditions to be run. */
	public preconditions: PreconditionContainerArray;

	/** Longer version of command's summary and how to use it */
	public detailedDescription: DetailedDescriptionCommand;

	/** The full category for the command, can be overridden by setting the {@link Command.Options.fullCategory} option. */
	public readonly fullCategory: readonly string[];

	/** The strategy to use for the lexer. */
	public strategy: IUnorderedStrategy;

	/** If {@link KairoClient.typing} is true, it can be overridden for a specific command using this property, set via its options. Otherwise, this property will be ignored.
	 * @default true */
	public typing: boolean;

	/** The application command registry associated with this command. */
	public readonly applicationCommandRegistry = acquire(this.name);

	/** The lexer to be used for command parsing */
	protected lexer: Lexer;

	public constructor(
		context: Command.Context,
		options: Options = {} as Options,
	) {
		const name = options.name ?? context.name;
		super(context, { ...options, name: name.toLowerCase() });

		this.rawName = name;
		this.description = options.description ?? "";
		this.detailedDescription = options.detailedDescription ?? "";
		this.strategy = new FlagUnorderedStrategy(options);
		this.fullCategory = options.fullCategory ?? this.location.directories;
		this.typing = options.typing ?? true;

		this.lexer = new Lexer({
			quotes: options.quotes ?? [
				['"', '"'], // Double quotes
				["“", "”"], // Fancy quotes (on iOS)
				["「", "」"], // Corner brackets (CJK)
				["«", "»"], // French quotes (guillemets)
			],
		});

		if (options.generateDashLessAliases) {
			const dashLessAliases: string[] = [];
			if (this.name.includes("-"))
				dashLessAliases.push(this.name.replace(/-/g, ""));
			for (const alias of this.aliases)
				if (alias.includes("-")) dashLessAliases.push(alias.replace(/-/g, ""));

			this.aliases = [...this.aliases, ...dashLessAliases];
		}

		if (options.generateUnderscoreLessAliases) {
			const underscoreLessAliases: string[] = [];
			if (this.name.includes("_"))
				underscoreLessAliases.push(this.name.replace(/_/g, ""));
			for (const alias of this.aliases)
				if (alias.includes("_"))
					underscoreLessAliases.push(alias.replace(/_/g, ""));

			this.aliases = [...this.aliases, ...underscoreLessAliases];
		}

		this.preconditions = new PreconditionContainerArray(options.preconditions);
		this.parseConstructorPreConditions(options);
	}

	/** The message pre-parse method. This method can be overridden by plugins to define their own argument parser. */
	public messagePreParse(
		message: Message,
		parameters: string,
		context: MessageCommand.RunContext,
	): Awaitable<PreParseReturn> {
		const parser = new Parser(this.strategy);
		const args = new ArgumentStream(parser.run(this.lexer.run(parameters)));
		return new Args(
			message,
			this as MessageCommand,
			args,
			context,
		) as PreParseReturn;
	}

	/** The main category for the command, if any. */
	public get category(): string | null {
		return this.fullCategory.at(0) ?? null;
	}

	/** The sub-category for the command, if any. */
	public get subCategory(): string | null {
		return this.fullCategory.at(1) ?? null;
	}

	/** The parent category for the command. */
	public get parentCategory(): string | null {
		return this.fullCategory.at(-1) ?? null;
	}

	/** Run the message command's logic. */
	public messageRun?(
		message: Message,
		args: PreParseReturn,
		context: MessageCommand.RunContext,
	): Awaitable<unknown>;

	/** Run the application command's logic. */
	public chatInputRun?(
		interaction: ChatInputCommandInteraction,
		context: ChatInputCommand.RunContext,
	): Awaitable<unknown>;

	/** Run the context menu's logic. */
	public contextMenuRun?(
		interaction: ContextMenuCommandInteraction,
		context: ContextMenuCommand.RunContext,
	): Awaitable<unknown>;

	/** Handle autocomplete for this command. This takes priority over a matching interaction handler. */
	public autocompleteRun?(
		interaction: AutocompleteInteraction,
	): Awaitable<unknown>;

	/** Defines the JSON.stringify behavior of the command. */
	public override toJSON(): CommandJSON {
		return {
			...super.toJSON(),
			description: this.description,
			detailedDescription: this.detailedDescription,
			category: this.category,
		};
	}

	/** Register the application commands that should be handled by this command. */
	public registerApplicationCommands?(
		registry: ApplicationCommandRegistry,
	): Awaitable<void>;

	/** Type-guard that ensures the command supports message commands by checking if the handler for it is present */
	public supportsMessageCommands(): this is MessageCommand {
		return isFunction(Reflect.get(this, "messageRun"));
	}

	/** Type-guard that ensures the command supports chat input commands by checking if the handler for it is present */
	public supportsChatInputCommands(): this is ChatInputCommand {
		return isFunction(Reflect.get(this, "chatInputRun"));
	}

	/** Type-guard that ensures the command supports context menu commands by checking if the handler for it is present */
	public supportsContextMenuCommands(): this is ContextMenuCommand {
		return isFunction(Reflect.get(this, "contextMenuRun"));
	}

	/** Type-guard that ensures the command supports handling autocomplete interactions by checking if the handler for it is present */
	public supportsAutocompleteInteractions(): this is AutocompleteCommand {
		return isFunction(Reflect.get(this, "autocompleteRun"));
	}

	/** Build the command preconditions from its options. */
	protected parseConstructorPreConditions(options: Command.Options): void {
		this.parseConstructorPreConditionsRunIn(options);
		this.parseConstructorPreConditionsNsfw(options);
		this.parseConstructorPreConditionsRequiredClientPermissions(options);
		this.parseConstructorPreConditionsRequiredUserPermissions(options);
		this.parseConstructorPreConditionsCooldown(options);
	}

	/** Appends the `NSFW` precondition if {@link Command.Options.nsfw} is set to true. */
	protected parseConstructorPreConditionsNsfw(options: Command.Options) {
		parseConstructorPreConditionsNsfw(options.nsfw, this.preconditions);
	}

	/** Appends the `RunIn` precondition based on the values passed, defaulting to `null`, which doesn't add a precondition. */
	protected parseConstructorPreConditionsRunIn(options: Command.Options) {
		parseConstructorPreConditionsRunIn(
			options.runIn,
			this.resolveConstructorPreConditionsRunType.bind(this),
			this.preconditions,
		);
	}

	/** Appends the `ClientPermissions` precondition when {@link Command.Options.requiredClientPermissions} resolves to a non-zero bitfield. */
	protected parseConstructorPreConditionsRequiredClientPermissions(
		options: Command.Options,
	) {
		parseConstructorPreConditionsRequiredClientPermissions(
			options.requiredClientPermissions,
			this.preconditions,
		);
	}

	/** Appends the `UserPermissions` precondition when {@link Command.Options.requiredUserPermissions} resolves to a non-zero bitfield. */
	protected parseConstructorPreConditionsRequiredUserPermissions(
		options: Command.Options,
	) {
		parseConstructorPreConditionsRequiredUserPermissions(
			options.requiredUserPermissions,
			this.preconditions,
		);
	}

	/** Appends the `Cooldown` precondition when {@link Command.Options.cooldownLimit} and {@link Command.Options.cooldownDelay} are both non-zero. */
	protected parseConstructorPreConditionsCooldown(options: Command.Options) {
		parseConstructorPreConditionsCooldown(
			this,
			options.cooldownLimit,
			options.cooldownDelay,
			options.cooldownScope,
			options.cooldownFilteredUsers,
			this.preconditions,
		);
	}

	/** Resolve the {@link Command.Options.runIn} option into a {@link Command.RunInTypes} array. */
	protected resolveConstructorPreConditionsRunType(
		types: CommandRunInUnion,
	): readonly ChannelType[] | null {
		if (isNullish(types)) return null;
		if (typeof types === "number") return [types];
		if (typeof types === "string") {
			switch (types) {
				case "DM":
					return [ChannelType.DM];
				case "GUILD_TEXT":
					return [ChannelType.GuildText];
				case "GUILD_VOICE":
					return [ChannelType.GuildVoice];
				case "GUILD_NEWS":
					return [ChannelType.GuildAnnouncement];
				case "GUILD_NEWS_THREAD":
					return [ChannelType.AnnouncementThread];
				case "GUILD_PUBLIC_THREAD":
					return [ChannelType.PublicThread];
				case "GUILD_PRIVATE_THREAD":
					return [ChannelType.PrivateThread];
				case "GUILD_ANY":
					return GuildChannelTypes;
				default:
					return null;
			}
		}

		// If there's no channel it can run on, throw an error:
		if (types.length === 0) {
			throw new Error(
				`${this.constructor.name}[${this.name}]: "runIn" was specified as an empty array.`,
			);
		}

		if (types.length === 1) {
			return this.resolveConstructorPreConditionsRunType(types[0]);
		}

		const resolved = new Set<ChannelType>();
		for (const typeResolvable of types) {
			for (const type of this.resolveConstructorPreConditionsRunType(
				typeResolvable,
			) ?? [])
				resolved.add(type);
		}

		// If all types were resolved, optimize to null:
		if (resolved.size === ChannelTypes.length) return null;

		// Return the resolved types in ascending order:
		return [...resolved].sort((a, b) => a - b);
	}

	public static runInTypeIsSpecificsObject(
		types: Command.Options["runIn"],
	): types is CommandSpecificRunIn {
		if (!isObject(types)) {
			return false;
		}

		const specificTypes = types as CommandSpecificRunIn;
		return Boolean(
			specificTypes.chatInputRun ||
			specificTypes.messageRun ||
			specificTypes.contextMenuRun,
		);
	}
}

export namespace Command {
	export type Options = CommandOptions;
	export type JSON = CommandJSON;
	export type Context = AliasModule.Context<"commands">;
	export type RunInTypes = CommandOptionsRunType;
	export type RunInUnion = CommandRunInUnion;
	export type SpecificRunIn = CommandSpecificRunIn;
	export type ChatInputCommandInteraction<
		Cached extends import("discord.js").CacheType =
			import("discord.js").CacheType,
	> = import("discord.js").ChatInputCommandInteraction<Cached>;
	export type ContextMenuCommandInteraction<
		Cached extends import("discord.js").CacheType =
			import("discord.js").CacheType,
	> = import("discord.js").ContextMenuCommandInteraction<Cached>;
	export type AutocompleteInteraction<
		Cached extends import("discord.js").CacheType =
			import("discord.js").CacheType,
	> = import("discord.js").AutocompleteInteraction<Cached>;
	export type Registry = ApplicationCommandRegistry;
}
