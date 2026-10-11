import type { APIChannel, APIGuild, APIGuildMember, APIMessage, APIRole } from 'discord-api-types/v10';
import type { $GatewayDispatch } from '../gateway/types';

/** Omission preserves a value; null and arrays replace it. */
export type $Patch<T> = T extends readonly unknown[] ? T : T extends object ? { [K in keyof T]?: $Patch<T[K]> } : T;

/** Completeness is promoted only by an authoritative full entity, never by accumulated partials. */
export type $CacheEntry<T> = { complete: true; data: T } | { complete: false; data: $Patch<T> };

export interface $CacheEntities {
	guild: APIGuild & { unavailable?: boolean };
	channel: APIChannel;
	role: APIRole;
	member: APIGuildMember;
	message: APIMessage;
}
export type $CacheKind = keyof $CacheEntities;
export interface $CacheDecision {
	kind: $CacheKind;
	id: string;
	scope: string;
	data: Readonly<object>;
}
/** False rejects admission and removes a resident entry. Exceptions stop processing. */
export type $CachePolicy = (entry: $CacheDecision) => boolean;
export interface $CacheOptions {
	guilds?: boolean;
	channels?: boolean;
	roles?: boolean;
	membersPerGuild?: number | ((guildId: string) => number);
	messagesPerChannel?: number;
	policy?: $CachePolicy;
}

export type $CacheDeletion = {
	[K in $CacheKind]: {
		kind: K;
		id: string;
		scope: string;
		previous: $CacheEntry<$CacheEntities[K]> | undefined;
		payload: $GatewayDispatch;
	};
}[$CacheKind];
