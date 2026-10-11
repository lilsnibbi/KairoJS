export enum CooldownLevel {
	Author = 'author',
	Channel = 'channel',
	Guild = 'guild'
}

/** The scope the cooldown applies to. */
export enum BucketScope {
	/** Per channel cooldowns. */
	Channel,
	/** Global cooldowns. */
	Global,
	/** Per guild cooldowns. */
	Guild,
	/** Per user cooldowns. */
	User
}

export enum RegisterBehavior {
	Overwrite = 'OVERWRITE',
	LogToConsole = 'LOG_TO_CONSOLE',
	/** Find all differences in the commands provided using our internal computation method, and logs them to the console, while applying them. */
	VerboseOverwrite = 'VERBOSE_OVERWRITE',
	/** Makes KairoJS handle all command registrations, removals, and updates for you. */
	BulkOverwrite = 'BULK_OVERWRITE'
}

export enum InternalRegistryAPIType {
	ChatInput,
	ContextMenu
}

/** The allowed values for {@link CommandOptions.runIn} as an enum. */
export enum CommandOptionsRunTypeEnum {
	Dm = 'DM',
	GuildText = 'GUILD_TEXT',
	GuildVoice = 'GUILD_VOICE',
	GuildNews = 'GUILD_NEWS',
	GuildNewsThread = 'GUILD_NEWS_THREAD',
	GuildPublicThread = 'GUILD_PUBLIC_THREAD',
	GuildPrivateThread = 'GUILD_PRIVATE_THREAD',
	GuildAny = 'GUILD_ANY'
}

/** The available command pre-conditions. */
export enum CommandPreConditions {
	Cooldown = 'Cooldown',
	/** @deprecated Use {@link RunIn} instead. */
	DirectMessageOnly = 'DMOnly',
	RunIn = 'RunIn',
	/** @deprecated Use {@link RunIn} instead. */
	GuildNewsOnly = 'GuildNewsOnly',
	/** @deprecated Use {@link RunIn} instead. */
	GuildNewsThreadOnly = 'GuildNewsThreadOnly',
	/** @deprecated Use {@link RunIn} instead. */
	GuildOnly = 'GuildOnly',
	/** @deprecated Use {@link RunIn} instead. */
	GuildPrivateThreadOnly = 'GuildPrivateThreadOnly',
	/** @deprecated Use {@link RunIn} instead. */
	GuildPublicThreadOnly = 'GuildPublicThreadOnly',
	/** @deprecated Use {@link RunIn} instead. */
	GuildTextOnly = 'GuildTextOnly',
	/** @deprecated Use {@link RunIn} instead. */
	GuildVoiceOnly = 'GuildVoiceOnly',
	/** @deprecated Use {@link RunIn} instead. */
	GuildThreadOnly = 'GuildThreadOnly',
	NotSafeForWork = 'NSFW',
	ClientPermissions = 'ClientPermissions',
	UserPermissions = 'UserPermissions'
}
