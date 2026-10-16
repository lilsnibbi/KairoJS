import type { Interaction } from "discord.js";
import { Module } from "../../core/modules/index";
import type { Awaitable } from "../../utilities/index";
import { Option } from "../../utilities/result/index";

export abstract class InteractionHandler<
	Options extends InteractionHandler.Options = InteractionHandler.Options,
> extends Module<Options, "interactions"> {
	public static override readonly options?: InteractionHandler.Options;
	/** The type for this handler */
	public readonly interactionHandlerType: InteractionHandlerTypes;

	public constructor(context: InteractionHandler.Context, options: Options) {
		super(context, options);

		this.interactionHandlerType = options.interactionHandlerType;
	}

	public abstract run(interaction: Interaction, parsedData?: unknown): unknown;

	/** A custom function that will be called when checking if an interaction should be passed to this handler. */
	public parse(_interaction: Interaction): Awaitable<Option<unknown>> {
		return this.some();
	}

	public some(): Option.Some<never>;
	public some<T>(data: T): Option.Some<T>;
	public some<T>(data?: T): Option.Some<T | undefined> {
		return Option.some(data);
	}

	public none(): Option.None {
		return Option.none;
	}

	public override toJSON(): InteractionHandlerJSON {
		return {
			...super.toJSON(),
			interactionHandlerType: this.interactionHandlerType,
		};
	}
}

export interface InteractionHandlerOptions extends Module.Options {
	/** The type of interaction this handler is for. Must be one of {@link InteractionHandlerTypes}. */
	readonly interactionHandlerType: InteractionHandlerTypes;
}

export interface InteractionHandlerJSON extends Module.JSON {
	interactionHandlerType: InteractionHandlerTypes;
}

export type InteractionHandlerParseResult<Instance extends InteractionHandler> =
	Option.UnwrapSome<Awaited<ReturnType<Instance["parse"]>>>;

export namespace InteractionHandler {
	export type Context = Module.Context<"interactions">;
	export type Options = InteractionHandlerOptions;
	export type JSON = InteractionHandlerJSON;
	export type ParseResult<Instance extends InteractionHandler> =
		InteractionHandlerParseResult<Instance>;
}

export enum InteractionHandlerTypes {
	// Specifically focused types
	Button,
	SelectMenu,
	ModalSubmit,

	// More free-falling handlers, for 1 shared handler between buttons and select menus (someone will have a use for this >,>)
	MessageComponent,
	// Optional autocompletes, you can use this or in-command
	Autocomplete,
}
