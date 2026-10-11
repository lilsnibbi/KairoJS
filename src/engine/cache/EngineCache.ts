import type { APIChannel, APIGuildMember, APIMessage, APIRole } from 'discord-api-types/v10';
import { GatewayDispatchEvents as E } from 'discord-api-types/v10';
import { integer, record } from '../common';
import type { $GatewayDispatch } from '../gateway/types';
import { visitActivity } from './activity';
import { CacheStore } from './CacheStore';
import { ScopedCache } from './ScopedCache';
import type { $CacheDeletion, $CacheEntities, $CacheKind, $CacheOptions, $Patch } from './types';

/** Owns synchronous resident state. Native gateway payloads remain untouched. */
export class EngineCache {
	public readonly guilds = new CacheStore<$CacheEntities['guild']>();
	public readonly channels = new CacheStore<APIChannel>();
	public readonly roles = new ScopedCache<APIRole>(Number.POSITIVE_INFINITY);
	public readonly members: ScopedCache<APIGuildMember>;
	public readonly messages: ScopedCache<APIMessage>;
	private readonly channelOwners = new Map<string, string>();
	private readonly options: $CacheOptions;

	public constructor(options: $CacheOptions = {}) {
		this.options = { ...options };
		if (typeof options.membersPerGuild === 'number') integer(options.membersPerGuild, 'membersPerGuild');
		integer(options.messagesPerChannel ?? 0, 'messagesPerChannel');
		const memberLimit = options.membersPerGuild ?? 1000;
		this.members = new ScopedCache(
			typeof memberLimit === 'number' ? memberLimit : (guild) => integer(memberLimit(guild), 'membersPerGuild')
		);
		this.messages = new ScopedCache(options.messagesPerChannel ?? 0);
	}
	public clear(): void {
		this.guilds.clear();
		this.channels.clear();
		this.roles.clear();
		this.members.clear();
		this.messages.clear();
		this.channelOwners.clear();
	}
	private allows(kind: $CacheKind, id: string, scope: string, data: object): boolean {
		const enabled =
			kind === 'guild'
				? this.options.guilds !== false
				: kind === 'channel'
					? this.options.channels !== false
					: kind === 'role'
						? this.options.roles !== false
						: true;
		return enabled && (this.options.policy?.({ kind, id, scope, data }) ?? true);
	}
	public putMember(guildId: string, id: string, data: APIGuildMember): void {
		if (this.allows('member', id, guildId, data)) this.members.put(guildId, id, data);
		else this.members.delete(guildId, id);
	}
	public patchMember(guildId: string, id: string, data: $Patch<APIGuildMember>): void {
		if (this.allows('member', id, guildId, data)) this.members.patch(guildId, id, data);
		else this.members.delete(guildId, id);
	}
	public putChannel(data: APIChannel, guildId?: string): void {
		const scope = guildId ?? ('guild_id' in data ? data.guild_id : undefined) ?? '';
		if (this.allows('channel', data.id, scope, data)) {
			this.channels.put(data.id, data);
			if (scope) this.channelOwners.set(data.id, scope);
		} else {
			this.channels.delete(data.id);
			if (!this.messages.size(data.id)) this.channelOwners.delete(data.id);
		}
	}
	public putMessage(data: APIMessage, guildId?: string): void {
		if (this.allows('message', data.id, data.channel_id, data)) {
			const entry = this.messages.put(data.channel_id, data.id, data);
			if (entry && guildId) this.channelOwners.set(data.channel_id, guildId);
		} else {
			this.messages.delete(data.channel_id, data.id);
			this.releaseOwner(data.channel_id);
		}
	}
	private putRole(guildId: string, role: APIRole): void {
		if (this.allows('role', role.id, guildId, role)) this.roles.put(guildId, role.id, role);
		else this.roles.delete(guildId, role.id);
	}
	private releaseOwner(id: string): void {
		if (!this.channels.has(id) && !this.messages.size(id)) this.channelOwners.delete(id);
	}
	private removeChannel(id: string): void {
		this.channels.delete(id);
		this.messages.clear(id);
		this.channelOwners.delete(id);
	}
	private removeGuild(id: string): void {
		this.guilds.delete(id);
		this.roles.clear(id);
		this.members.clear(id);
		for (const [channelId, owner] of this.channelOwners) if (owner === id) this.removeChannel(channelId);
	}

	/** Run once per dispatch, before invoking public handlers. */
	public apply(payload: $GatewayDispatch): $CacheDeletion[] {
		const data = payload.d;
		const scope =
			record(data) && typeof data.guild_id === 'string' ? data.guild_id : payload.t === E.GuildCreate ? payload.d.id : undefined;
		visitActivity(data, scope, (guild, id, member) => {
			if (member) this.patchMember(guild, id, member);
			else this.members.touch(guild, id);
		});
		switch (payload.t) {
			case E.Ready:
				for (const guild of payload.d.guilds) if (this.allows('guild', guild.id, '', guild)) this.guilds.patch(guild.id, guild);
				break;
			case E.GuildCreate: {
				const guild = payload.d;
				// Guild metadata is explicitly partial: collection snapshots live in their own caches.
				const { members, channels, threads, roles, presences: _presences, voice_states: _voices, ...metadata } = guild;
				if (this.allows('guild', guild.id, '', metadata)) this.guilds.patch(guild.id, { ...metadata, unavailable: false });
				else this.guilds.delete(guild.id);
				const channelIds = new Set([...channels, ...threads].map((channel) => channel.id));
				for (const [id, owner] of this.channelOwners) if (owner === guild.id && !channelIds.has(id)) this.removeChannel(id);
				for (const channel of [...channels, ...threads]) this.putChannel(channel, guild.id);
				const roleIds = new Set(roles.map((role) => role.id));
				for (const [id] of this.roles.entries(guild.id)) if (!roleIds.has(id)) this.roles.delete(guild.id, id);
				for (const role of roles) this.putRole(guild.id, role);
				for (const member of members) if (member.user) this.putMember(guild.id, member.user.id, member);
				break;
			}
			case E.GuildUpdate: {
				const { roles, ...metadata } = payload.d;
				if (this.allows('guild', metadata.id, '', metadata)) this.guilds.patch(metadata.id, metadata);
				else this.guilds.delete(metadata.id);
				if (roles) {
					const ids = new Set(roles.map((role) => role.id));
					for (const [id] of this.roles.entries(metadata.id)) if (!ids.has(id)) this.roles.delete(metadata.id, id);
					for (const role of roles) this.putRole(metadata.id, role);
				}
				break;
			}
			case E.GuildDelete: {
				const { id, unavailable } = payload.d;
				if (unavailable) {
					if (this.allows('guild', id, '', payload.d)) this.guilds.patch(id, { id, unavailable });
					else this.guilds.delete(id);
					// No valid member snapshot survives an outage without replay.
					this.members.clear(id);
					break;
				}
				const previous = this.guilds.peek(id);
				this.removeGuild(id);
				return [{ kind: 'guild', id, scope: '', previous, payload }];
			}
			case E.ChannelCreate:
			case E.ThreadCreate:
				this.putChannel(payload.d);
				break;
			case E.ChannelUpdate:
			case E.ThreadUpdate: {
				const channel = payload.d;
				const guild = 'guild_id' in channel ? (channel.guild_id ?? '') : '';
				if (this.allows('channel', channel.id, guild, channel)) {
					this.channels.patch(channel.id, channel);
					if (guild) this.channelOwners.set(channel.id, guild);
				} else {
					this.channels.delete(channel.id);
					this.releaseOwner(channel.id);
				}
				break;
			}
			case E.ChannelDelete:
			case E.ThreadDelete: {
				const { id } = payload.d;
				const previous = this.channels.peek(id);
				const owner = this.channelOwners.get(id) ?? '';
				this.removeChannel(id);
				// Deleting a parent channel also invalidates resident child threads.
				for (const [child, entry] of this.channels) if ('parent_id' in entry.data && entry.data.parent_id === id) this.removeChannel(child);
				return [{ kind: 'channel', id, scope: owner, previous, payload }];
			}
			case E.ThreadListSync: {
				const { guild_id, channel_ids, threads } = payload.d;
				const ids = new Set(threads.map((thread) => thread.id));
				for (const [id, entry] of this.channels) {
					const channel = entry.data;
					if (
						this.channelOwners.get(id) === guild_id &&
						'thread_metadata' in channel &&
						!channel.thread_metadata?.archived &&
						(!channel_ids ||
							('parent_id' in channel && typeof channel.parent_id === 'string' && channel_ids.includes(channel.parent_id))) &&
						!ids.has(id)
					)
						this.removeChannel(id);
				}
				for (const thread of threads) this.putChannel(thread, guild_id);
				break;
			}
			case E.GuildRoleCreate:
			case E.GuildRoleUpdate:
				this.putRole(payload.d.guild_id, payload.d.role);
				break;
			case E.GuildRoleDelete: {
				const { guild_id, role_id } = payload.d;
				const previous = this.roles.delete(guild_id, role_id);
				for (const member of this.members.values(guild_id))
					if (member.data.roles) member.data.roles = member.data.roles.filter((id) => id !== role_id);
				return [{ kind: 'role', id: role_id, scope: guild_id, previous, payload }];
			}
			case E.GuildMemberAdd:
				if (payload.d.user) this.putMember(payload.d.guild_id, payload.d.user.id, payload.d);
				break;
			case E.GuildMemberUpdate:
				this.patchMember(payload.d.guild_id, payload.d.user.id, payload.d);
				break;
			case E.GuildMembersChunk:
				for (const member of payload.d.members) if (member.user) this.putMember(payload.d.guild_id, member.user.id, member);
				break;
			case E.PresenceUpdate: {
				const { guild_id, user } = payload.d;
				if (this.members.peek(guild_id, user.id)) this.patchMember(guild_id, user.id, { user });
				break;
			}
			case E.GuildMemberRemove: {
				const { guild_id, user } = payload.d;
				const previous = this.members.delete(guild_id, user.id);
				return [{ kind: 'member', id: user.id, scope: guild_id, previous, payload }];
			}
			case E.MessageCreate:
				this.putMessage(payload.d, payload.d.guild_id);
				break;
			case E.MessageUpdate: {
				const message = payload.d;
				if (this.allows('message', message.id, message.channel_id, message)) {
					const entry = this.messages.patch(message.channel_id, message.id, message);
					if (entry && message.guild_id) this.channelOwners.set(message.channel_id, message.guild_id);
				} else {
					this.messages.delete(message.channel_id, message.id);
					this.releaseOwner(message.channel_id);
				}
				break;
			}
			case E.MessageDelete: {
				const { channel_id, id } = payload.d;
				const previous = this.messages.delete(channel_id, id);
				this.releaseOwner(channel_id);
				return [{ kind: 'message', id, scope: channel_id, previous, payload }];
			}
			case E.MessageDeleteBulk: {
				const deleted: $CacheDeletion[] = payload.d.ids.map((id) => ({
					kind: 'message',
					id,
					scope: payload.d.channel_id,
					previous: this.messages.delete(payload.d.channel_id, id),
					payload
				}));
				this.releaseOwner(payload.d.channel_id);
				return deleted;
			}
		}
		return [];
	}
}
