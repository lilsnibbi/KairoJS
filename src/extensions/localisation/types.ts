import type { BaseInteraction, Guild, Interaction, Locale, LocalizationMap, Message, StageChannel, User, VoiceChannel } from 'discord.js';
import type { InitOptions } from 'i18next';
import type { Awaitable } from '../../utilities/index';

/** This is a re-exported type from i18next.  We could use NoInfer typescript build-in utility, however this project still supports ts < 5.4. */
export type $NoInfer<A> = [A][A extends any ? 0 : never];

/** This is a re-exported type from i18next. It is essentially an object of key-value pairs, where the key is a string and the value is any. */
export interface $Dictionary {
	[key: string]: any;
}

/** This is a re-exported type from i18next. It is the returned type from `resolveKey` when `returnObjects` is `true` in the options. */
export type $SpecialObject = $Dictionary | Array<string | $Dictionary>;

/** Used to dynamically add options based on found languages in {@link LocaleManager#init}. */
export type DynamicOptions<T extends InitOptions> = (namespaces: string[], languages: string[]) => T;

/** The options used in {@link LocaleManager}. */
export interface InternationalizationOptions {
	/** Default response language and, when supported by Discord, base presentation locale. */
	defaultName?: string;

	/** Additional resource roots, relative to the client root. Each contains locale/namespace.json. First valid namespace wins. */
	resourceDirectories?: readonly string[];
	/** Discord presentation settings. Missing/invalid generated entries warn and fall back unless strict is true. */
	discord?: { locales?: readonly Locale[]; defaultLocale?: Locale; strict?: boolean };
	/** Receive diagnostics instead of the framework logger (or process warnings for standalone managers). */
	onDiagnostic?: (diagnostic: LocalisationDiagnostic) => void;

	/** The options passed to `i18next.init`. */
	i18next?: InitOptions | DynamicOptions<InitOptions>;

	/** Primary resource root, relative to the client root; defaults to root/languages. */
	defaultLanguageDirectory?: string;

	/** The default value to be used if a specific language key isn't found. Defaults to "default:default". */
	defaultMissingKey?: string;

	/** The default NS that is prefixed to all keys that don't specify it. Defaults to "default". */
	defaultNS?: string;

	/** Array of formatters to add to i18n.
	 * @default [] */
	formatters?: I18nextFormatter[];

	/** A function that is to be used to retrieve the language for the current context.
	 * @default () => InternationalizationOptions.defaultName */
	fetchLanguage?: (context: InternationalizationContext) => Awaitable<string | null>;
}

export type TextBasedDiscordChannel = Message['channel'];
export type DiscordChannel = TextBasedDiscordChannel | StageChannel | VoiceChannel;

/** Context for {@link LocaleManager.fetchLanguage} functions. This context enables implementation of per-guild, per-channel, and per-user localization. */
export interface InternationalizationContext {
	/** The {@link Guild} object to fetch the preferred language for, or `null` if the language is to be fetched in a DM. */
	guild: Guild | null;
	/** The {@link DiscordChannel} object to fetch the preferred language for. */
	channel: DiscordChannel | null;
	/** The user to fetch the preferred language for. */
	user: User | null;
	interactionGuildLocale?: Interaction['guildLocale'];
	interactionLocale?: Interaction['locale'];
}

/** @deprecated Use {@link I18nextFormatter} instead */
export interface I18nextFormatters extends I18nextNamedFormatter {}

/** A formatter that is added to i18next with `i18next.services.formatter.add` or `i18next.services.formatter.addCached`, depending on the `cached` property. */
export type I18nextFormatter = I18nextNamedFormatter | I18nextNamedCachedFormatter;

/** A cached formatter that is added to i18next with `i18next.services.formatter.add`. */
export interface I18nextNamedFormatter {
	cached?: false;
	name: string;
	format(value: any, lng: string | undefined, options: any): string;
}

/** A cached formatter that is added to i18next with `i18next.services.formatter.addCached`. */
export interface I18nextNamedCachedFormatter {
	cached: true;
	name: string;
	format(lng: string | undefined, options: any): (value: any) => string;
}

export interface LocalizedData {
	value: string;
	localizations: LocalizationMap;
}

export interface BuilderWithName {
	readonly name?: string;
	readonly name_localizations?: LocalizationMap | null;
	setName(name: string): this;
	setNameLocalizations(localizedNames: LocalizationMap | null): this;
}

export interface BuilderWithDescription {
	readonly description?: string;
	readonly description_localizations?: LocalizationMap | null;
	setDescription(description: string): this;
	setDescriptionLocalizations(localizedDescriptions: LocalizationMap | null): this;
}

export type BuilderWithNameAndDescription = BuilderWithName & BuilderWithDescription;
export type ChannelTarget = Message | DiscordChannel;
export type Target = BaseInteraction | ChannelTarget | Guild;

/** Translation keys only; operational names and choice values always come from the command payload. */
export type CommandLocalisation =
	| string
	| {
			name?: string;
			description?: string;
			/** Keyed by the base option/subcommand/group name. A string expands to .name and .description recursively. */
			options?: Readonly<Record<string, CommandLocalisation>>;
			/** Match choices by exact value and type, never by translated label or array position. */
			choices?: readonly { value: string | number; name: string }[];
	  };

export interface LocalisationDiagnostic {
	code: 'resource' | 'duplicate' | 'unsupportedLocale' | 'missing' | 'invalid';
	message: string;
	path?: string;
	locale?: string;
	namespace?: string;
	key?: string;
	cause?: unknown;
}
