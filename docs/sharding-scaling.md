# Automatic shard deployment

Automatic scaling is **off by default**. Without `scaling`, `shardCount` and
`workers[].shards` remain fixed and metadata is fetched only at startup or when
the identify allowance expires. Enable scaling on the coordinator; hosts run
the same `ShardManager` and bot entrypoint.

## Coordinator configuration

```ts
import { ShardCoordinator } from "rilo/sharding";

const coordinator = new ShardCoordinator({
	shardCount: 2,
	workers: [
		{
			id: "a",
			token: process.env.HOST_A_SECRET!,
			shards: [0],
			maxShards: 4,
			weight: 2,
		},
		{
			id: "b",
			token: process.env.HOST_B_SECRET!,
			shards: [1],
			maxShards: 2,
			weight: 1,
		},
	],
	botToken: process.env.DISCORD_TOKEN!,
	scaling: {
		minShards: 2,
		maxShards: 6,
		targetGuildsPerShard: 1000,
		pollIntervalMs: 300000,
		cooldownMs: 1800000,
		confirmations: 3,
		allowDownscale: true,
		rebalanceThreshold: 0.25,
		sessionReserve: 10,
		drainTimeoutMs: 30000,
		readyTimeoutMs: 300000,
	},
});
await coordinator.start();
```

Keep credentials in your environment. Remote hosts need the normal TLS
configuration. This policy uses only configured hosts that are already running;
it never provisions machines, changes server settings or purchases capacity.
Every automatic host needs `maxShards`, including standby hosts with `shards: []`.
Initial assignments must cover `0..shardCount-1` exactly once and fit host capacity.

On startup, fresh Discord metadata, bounds and capacities determine the initial
assignment before hosts connect. `shardCount` is an initial configuration seed,
not a fixed count in automatic mode. No previous topology, guild counts,
confirmation history, cooldown or allowance is restored from disk. Set
`minShards` to retain an operational floor across coordinator restarts.

| Setting                | Default        | Meaning                                                                |
| ---------------------- | -------------- | ---------------------------------------------------------------------- |
| `maxShards`            | Required       | Global ceiling, 1–4096, also bounded by summed host capacity           |
| `minShards`            | `1`            | Minimum total, at most `maxShards`                                     |
| `targetGuildsPerShard` | Disabled (`0`) | Optional average target, 1–2500; requires accurate guild caches        |
| `pollIntervalMs`       | `300000`       | Metadata polling interval, 60000–86400000 ms                           |
| `cooldownMs`           | `1800000`      | Minimum interval between transition attempts, 60000–604800000 ms       |
| `confirmations`        | `3`            | Consecutive matching plans before a running deployment changes, 1–100  |
| `allowDownscale`       | `true`         | Allow fewer shards after confirmation and cooldown                     |
| `rebalanceThreshold`   | `0.25`         | Required improvement in peak weighted host guild load, 0.05–1          |
| `sessionReserve`       | `0`            | Unspent identify allowance to retain beyond the transition requirement |
| `drainTimeoutMs`       | `30000`        | Time for every host to confirm old process exits, 100–300000 ms        |
| `readyTimeoutMs`       | `300000`       | Time for the new deployment to become gateway-ready, 100–3600000 ms    |
| Host `maxShards`       | Required       | Maximum shard processes on this host, 1–4096                           |
| Host `weight`          | `1`            | Relative resource capacity, 0.01–1000; set it from your host sizing    |

## What Discord controls

Discord does not send a push event requesting a particular scale-up or
scale-down. The coordinator polls `GET /gateway/bot` for the recommended shard
count and fresh session-start metadata. Discord assigns guilds by
`(guild_id >> 22) % num_shards`; the framework cannot choose individual guilds or
move one guild to another shard independently. See the official
[Gateway sharding and session-start documentation](https://docs.discord.com/developers/events/gateway#sharding).

The desired count is the maximum of the recommendation, configured minimum and
`ceil(totalCachedGuilds / targetGuildsPerShard)` when that target is enabled.
Counts round up to multiples of the current recommendation, a conservative
choice compatible with Discord's large-bot shard-count multiple requirement.
This can overprovision compared with using arbitrary shard totals. The largest
legal count within configured capacity is used if the guild target cannot fit;
a recommendation or minimum that cannot fit blocks the change with
`SCALING_CAPACITY`. The recommendation is a floor, not an automatic instruction
to remove a particular existing shard.

Guild targets are averages, not a guarantee that every shard has that many
guilds. Discord's per-shard limit still applies. Uneven guild sizes, unavailable
guilds and custom caches affect the usefulness of guild counts. Keep the Guilds
intent and a complete guild cache if using guild targets. This is not CPU,
memory, member-count or event-volume monitoring.

For an unchanged total, allocation greedily places entire shards using observed
guild counts and host weights, while respecting per-host process limits.
Existing owners win equal-load ties. An allocation-only change requires the
configured improvement in peak weighted load. For a new total, individual shard
guild counts are unknown until login, so allocation uses equal estimated loads.
A later poll can rebalance hosts if the measured distribution warrants it.

## Transition and recovery

1. Fetch fresh metadata and apply the existing conservative identify accounting.
   All configured hosts must be connected, including standby hosts. Shrinking,
   guild-target changes and allocation-only balancing require every shard to
   report gateway readiness and metrics no older than 15 seconds. A larger
   Discord recommendation may grow an unready topology to repair insufficient
   sharding. A degraded committed deployment must recover before another change.
2. Require repeated matching plans and the cooldown. Before disrupting children,
   require unexpired remaining session starts of at least
   `max(currentCount, proposedCount) + sessionReserve`. The larger count covers
   either deployment or a pre-commit rollback. Insufficient budget defers the
   change without stopping healthy children.
3. Reject pending/new shard RPC and identify work with `RESHARDING`. Ask all hosts
   to drain. Each host cancels scheduled restarts, requests graceful shutdown,
   escalates only its own children if necessary, and confirms actual process
   exits. This interrupts bot availability and cancels in-flight work; application
   jobs must tolerate restarts. Even allocation-only changes restart all shards.
4. If a host disconnects or draining times out before commit, retain the old
   total and assignment. Still-connected hosts receive that assignment after
   their drains finish; reconnecting hosts receive it in their welcome. An
   unconfirmed child exit cannot authorize a replacement.
5. Once every old process is confirmed stopped, commit the new count and
   assignment in memory and start fresh children. After this point recovery
   moves forward: reconnecting hosts receive the committed topology. There is
   no rollback to a different total while new children are running.
6. Wait for gateway readiness. Failed startup/readiness leaves status
   `degraded`; ordinary configured process retries and host reconnection continue.
   Once all shards recover, status becomes `idle` automatically. Exhausted
   restart attempts, disabled restart, or application errors require correction
   and replacement/restart of the affected supervisor. No state-file cleanup is
   required.

Every IDENTIFY still uses the central `shardId % max_concurrency` bucket and
5.5-second cooldown. Permits are charged before delivery and never refunded.
Fresh metadata cannot increase an unexpired in-memory allowance. RESUME remains
discord.js behavior; this feature does not bypass Discord rate limits or alter
retry policy. Crashes during startup can consume additional session starts and
leave the deployment waiting for a fresh allowance. Choose host
`identifyTimeoutMs` and coordinator `readyTimeoutMs` for your total, concurrency,
startup time and possible retries; a large serial deployment can exceed defaults.

Automatic totals must also fit `limits.maxPending` (default 256) so the control
plane has room for startup identifies. Welcome and assignment frames must fit
`limits.maxBytes`; these checks happen before draining. Increase these bounded
limits deliberately when sizing a larger deployment. Host `identifyTimeoutMs`
is capped at 300000 ms. If the serial login queue cannot fit that deadline with
the bot's Discord concurrency, this deployment model cannot start the whole
topology reliably; more machines do not increase Discord concurrency.

Closing the coordinator aborts metadata requests and transition waits, closes
connections, and cancels polling. Surviving children keep Discord open in
maintenance while their hosts reconnect and reconcile individual leases. A
changed total closes the old gateway before a new session opens, even for the
same ID. Rejected IDs become dormant. Explicit scaling transitions still confirm
child exits and release leases before committing the new topology; reservations
belonging to disconnected instances block that transition.

The [process lifetime limitations](sharding-recovery.md) still apply: run one
coordinator per bot and supervise host process trees. There is no global grace
period on coordinator restart. A partitioned old Discord session can overlap a
replacement until it reconnects or reaches the configured outage cutoff.

## Observability and compatibility

`coordinator.shardCount` exposes the current committed total.
`coordinator.scalingStatus` is a copied snapshot with `phase`
(`disabled`, `idle`, `draining`, `starting` or `degraded`), `shardCount`, and optional
`reason`/`targetShards`. `await coordinator.checkScaling()` requests one immediate
evaluation; simultaneous calls share one promise and still respect confirmation,
cooldown, readiness and allowance checks. Periodic checks continue automatically.

Structured logs emit `scaling_status`, `scaling_failed` and host `reassigned`
events. Ordinary waiting/stable reasons are logged only when status changes.
Use `RILO_LOG_FORMAT=json` for full context. Logs contain counts and host IDs,
not guild IDs, tokens or application payloads.

Upgrade coordinator, hosts and children together. The internal transport adds
drain, assignment and bounded metrics frames; mixed framework versions are not
supported. Metrics distinguish IPC boot from actual gateway readiness.
Public logger customization, fixed totals and existing message APIs remain
available. Initial host placements are preferences; per-process leases control
ownership. In automatic mode, callers must tolerate `RESHARDING` and total-count
changes during requests/broadcasts. No ownership database, directory or lock is
introduced.

See [the runnable example configuration](../examples/README.md#automatic-scaling).
Regression tests use synthetic gateway metadata and real local Bun processes;
they never log in to Discord.
