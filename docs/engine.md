# Original Discord engine milestone

`kairojs/engine` is an experimental, independent Bun client implemented inside KairoJS. It owns its gateway session, REST transport and synchronous cache. The existing KairoClient, module system, commands, extensions and root exports retain their current behavior. Importing the engine does not migrate framework features.

## Run it

Use Bun 1.4.4 and `bun install --frozen-lockfile`.

```sh
bun run engine:test
bun check
bun lint
bun fmt --check
bun examples/engine/offline.ts
```

The offline example creates a loopback HTTP/WebSocket server, receives a message, replies using the engine's REST layer, then reconnects and resumes. It uses a literal fake token.

`bun examples/engine/live.ts` only logs instructions. To opt into Discord yourself, set `DISCORD_TOKEN` and add `--live`. The example requires Guilds, GuildMessages and MessageContent intents, plus permission to read and send in the channel. It replies to `!engine-ping`. Its interaction branch handles an already registered `engine-ping` command; it does not register commands. No live Discord validation was performed.

```ts
import { createConsoleLogger, EngineClient, logEvent } from "kairojs/engine";
import {
	GatewayIntentBits,
	InteractionResponseType,
} from "discord-api-types/v10";

const logger = createConsoleLogger("MyBot");
const client = new EngineClient({
	token: suppliedToken,
	intents: GatewayIntentBits.Guilds | GatewayIntentBits.GuildMessages,
	cache: { membersPerGuild: 1000, messagesPerChannel: 0 },
	onError: ({ source, error, fatal }) =>
		logEvent(logger, fatal ? "error" : "alert", {
			component: `engine.${source}`,
			event: "diagnostic",
			message: fatal
				? "Engine cannot continue; inspect the diagnostic cause before restarting."
				: "Engine reported a recoverable failure; inspect the diagnostic cause.",
			context: { fatal },
			error,
		}),
});
client.on("messageCreate", async (message) => {
	if (message.data.author.bot) return;
	await message.reply({ content: "Hello", allowed_mentions: { parse: [] } });
});
client.on("interactionCreate", async (interaction) => {
	if (interaction.data.type === 2)
		await interaction.respond({
			type: InteractionResponseType.ChannelMessageWithSource,
			data: { content: "Hello", allowed_mentions: { parse: [] } },
		});
});
await client.connect();
// client.close() aborts transport work and clears the session and caches.
```

Construction and imports open no connections. The engine never reads a token from the environment. Request bodies preserve snake_case fields and native discord-api-types/v10 types. `message.data` is an APIMessage; `interaction.data` is an APIInteraction. `message.reply` supplies a message_reference while preserving native reference options. `interaction.respond` accepts a complete native callback body.

The logging helpers share the framework's level, JSON/text, redaction and stack
settings; see [console logging](console-logging.md). The supplied `onError`
callback still receives the original error. Add fixed operation wording to the
record rather than printing arbitrary provider messages.

## Cache contract

| Cache                | Default | Lookup                               | Retention              |
| -------------------- | ------- | ------------------------------------ | ---------------------- |
| Guild metadata       | On      | `cache.guilds.get(id)`               | Until removal/reset    |
| Channels and threads | On      | `cache.channels.get(id)`             | Until removal/reset    |
| Roles                | On      | `cache.roles.get(guildId, id)`       | Until removal/reset    |
| Members              | On      | `cache.members.get(guildId, userId)` | LRU, 1,000 per guild   |
| Messages             | Off     | `cache.messages.get(channelId, id)`  | Opt-in LRU per channel |

Members have **no combined client limit**. `membersPerGuild` accepts a nonnegative integer or a function of guild ID. Zero disables storage. `guilds`, `channels` and `roles` accept false. `messagesPerChannel` opts into a finite per-channel limit. A synchronous `policy({ kind, id, scope, data })` can reject admission; false also removes an existing entry. A thrown policy error stops the client and clears state instead of continuing after a partly applied transaction. Custom backends are deferred.

Results are undefined or a `$CacheEntry<T>` with complete and data. Patches create `complete: false`; accumulated partial fields never promote it. A full typed put, full gateway creation/chunk, or explicit REST fetch can promote it in place. Guild entries intentionally remain partial metadata: bulk members, channels, roles, presences and voice states live separately. This avoids retaining a second unbounded member snapshot inside the guild.

Resident entry and data identities remain stable during updates. Nested objects merge; omitted/undefined fields remain; explicit null replaces; arrays replace old contents, so `roles: []` removes membership. Identity ends at eviction, deletion, fresh identification or close. Treat cached objects as engine-owned mutable views; use structuredClone when you need a snapshot.

Targeted get, writes and gateway activity update LRU recency. Peek, has, values, entries and iteration do not. Activity discovery follows nested member payloads, guild-scoped user/author IDs, resolved member maps, mentioned users and member/user ID lists. Messages, commands, buttons, reactions, typing and voice payloads participate without an event-name whitelist. Future shapes without recognizable guild/member identity require an explicit cache call or adapter.

Deletion removes data before handlers. `cacheDelete` supplies the original dispatch in payload and previous when resident. Missing entries yield undefined; partial previous entries remain partial. Bulk message deletion finishes all removals before any deletion handler. Guild removal clears resident children. An unavailable guild remains marked unavailable and invalidates its member scope. Role deletion removes its ID from resident member role arrays without touching recency.

`fetchMember`, `fetchChannel` and `fetchMessage` are explicit HTTP operations; cache lookup never fetches. A fetch writes back only if no gateway dispatch or session reset occurred while pending. Otherwise it returns the HTTP snapshot without overwriting newer gateway state. This conservative rule avoids resurrecting deleted entries, but may skip insertion during unrelated activity.

## Ordering and failures

Each EngineClient owns one shard. Decoding, cache mutation and event invocation run synchronously in arrival order. Promise-returning handlers overlap; later cache processing does not await them. A live object's fields can change across await. Synchronous CPU-heavy user code still blocks Bun's event loop.

Events are ready, resumed, messageCreate, messageUpdate, interactionCreate, cacheDelete, dispatch and gatewayState. Raw dispatch follows specialized callbacks and sees updated cache. On returns an unsubscribe function. Handler exceptions/rejections go to onError without stopping later handlers. The default ceiling is 1,024 outstanding handler promises. Overflow reports a fatal error and closes the client instead of retaining unbounded work. Closing does not await or cancel developer promises; idle is available when they are known to settle.

Gateway ownership includes HELLO/session timeouts, jittered heartbeats, requested beats, ACK debt, reconnect backoff, session ID/sequence/resume URL, stale-generation rejection and cleanup. Fresh identification clears state; resume preserves it. Fatal close codes stop retries. Defaults: 10 reconnect attempts, 15-second handshake deadline, 8 MiB input frames, and capped exponential reconnect delays with jitter. Uncompressed v10 JSON needs no async decoding queue. Runtime validation covers the envelope/session fields, not every entity schema.

REST admits up to 8 concurrent attempts. Identical normalized routes and learned bucket hashes serialize within each channel/guild/webhook major partition; independent routes progress concurrently. Cooldowns apply before admitting more attempts. The bound is 1,024 logical requests, including retry delays. Each attempt has a 15-second timeout and an 8 MiB response limit. Rate-limit metadata is bounded independently; exhausting it while cooldowns remain active fails explicitly.

429 handling uses retry_after or Retry-After with a separate retry ceiling of 5. Transport and 5xx failures retry GET/PUT/DELETE at most twice. POST/PATCH are not replayed after ambiguous failure. Interaction initial responses cannot race; ambiguity leaves replyState unknown. JSON bodies are snapshotted on submission. Redirects are rejected and endpoints require TLS except loopback tests. Client/transport token fields are private and absent from ordinary JSON serialization.

## Validation results

Historical validation on 2026-10-11 used Bun 1.4.2 on Windows x64 and a disposable Redis 7.4.11 container:

- `bun install --frozen-lockfile --ignore-scripts`: succeeded without lock changes.
- `bun run engine:test`: 76 passing tests across four files, 279 assertions.
- `bun scripts/ci.ts` with `KAIRO_TEST_REDIS_URL`: 2,361 passing tests across 226 files, 4,943 assertions, zero failures and zero skipped tests.
- The same CI run passed type checking, the lint and formatting checks configured at the time, the existing offline framework example, the engine offline example and `bun run smoke`.
- The smoke test packed and installed the package in a temporary consumer, audited public exports/notices, loaded a framework command and ran the native engine connect/reply/resume example.

Engine coverage comprises 14 cache tests, 11 client/event/helper tests, 28 gateway/protocol/identify tests and 23 REST tests. They exercise partial/null updates, resident identity, LRU boundaries and recency, deletion ordering, concurrent handlers, fetch/delete races, heartbeat debt, disconnect/resume/session invalidation, malformed/premature frames, stale sockets, cleanup, rate limits, bounded retries, cancellation and request limits.

The live example was checked without `--live`. No real Discord token was retrieved and no live bot connection or Discord message was sent.

## Protocol and architectural references

Reviewed on 2026-10-11:

- [Gateway lifecycle](https://docs.discord.com/developers/events/gateway): discovery, HELLO, heartbeat/ACK, identify, resume URLs, sequences and session budgets.
- [Gateway events](https://docs.discord.com/developers/events/gateway-events) and [close codes](https://docs.discord.com/developers/topics/opcodes-and-status-codes): payloads and recoverable/fatal closures.
- [Rate limits](https://docs.discord.com/developers/topics/rate-limits): bucket hashes, major resources, fractional resets and global 429 handling.
- [Message resource](https://docs.discord.com/developers/resources/message) and [interaction responses](https://docs.discord.com/developers/interactions/receiving-and-responding): native body fields and callback endpoints.
- [discord-api-types 0.38.56](https://github.com/discordjs/discord-api-types/releases/tag/0.38.56): checked against public npm latest and pinned exactly in package.json and bun.lock.

`$MessageUpdateData` conservatively permits omitted native update fields with Partial plus required id/channel_id. Version 0.38.56 declares the create fields required for updates. This engine retains the agreed partial-update contract without renaming or reinterpreting fields.

The Ovencord checkout was read only. Package boundaries, WebSocketShard/identify strategies, REST SequentialHandler's bucket/major/global separation, and CachedManager's resident patching boundary informed the review. Its source, Collection abstraction, compatibility API and benchmark claims were not copied. Kairo uses its own Map/Set stores, scheduler, lifecycle and helpers.

## Production gaps

- A real bot session needs explicit approval. Extended reconnect soak tests and large real guild payloads remain untested; this milestone uses deterministic mocks and local servers.
- One shard per client is supported. The local identify budget cannot account for other processes or persist session starts across restarts. Supply waitForIdentify when sharing a token and integrate the existing Kairo coordinator.
- Add full payload validation and broader cache projections. Reaction counts, user updates across every guild, thread membership and ancillary guild collections still need reconciliation. This is not complete Discord cache coverage.
- Add compression, multipart uploads, additional typed endpoints, proactive global pacing, route-specific sublimits, retry telemetry and deadline-aware prioritization. Different routes can be coalesced only after headers reveal their shared bucket.
- Interaction callbacks share the bounded REST scheduler. Respond or defer promptly to meet Discord's initial-response deadline; automatic deferral, follow-up helpers and deadline reservation remain future work.
- Profile real traces before changing policy. Activity traversal, cache misses and JSON parsing need realistic workload evaluation.

## Future Kairo integration

1. Introduce engine-facing command/listener contexts using native payloads and thin helpers, then test adapters for current framework contracts.
2. Replace discord.js-specific permission, resolver, collector, pagination and registration dependencies at explicit boundaries without building a compatibility clone.
3. Wire ShardLink.waitForIdentify, shard readiness and cleanup into EngineClient's injected permits and state hooks.
4. Port extensions and example bots with contract tests before changing KairoClient's runtime and retiring discord.js dependencies.

The independent subpath is deliberate. The root API baseline stays intact, and a test verifies that this engine and the existing offline KairoClient coexist without changing the framework container.
