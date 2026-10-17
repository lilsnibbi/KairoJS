# Live shard statistics

Use `this.container.sharding.stats()` inside a command, listener or service to ask
every configured shard for its current stats. `client.sharding.stats()` and
`manager.stats()` provide the same API. No application handler registration is needed.

```ts
const results = await this.container.sharding.stats();
for (const [shard, result] of results) {
	if (result.ok) {
		this.container.logger.notif(
			`Shard ${shard}: ${result.value.guilds} cached guilds`,
		);
	} else {
		this.container.logger.alert(`Shard ${shard}: ${result.error.code}`);
	}
}

// A specific shard still returns a map, with exactly one entry.
const one = await this.container.sharding.stats(0, { timeoutMs: 5000 });
const shardZero = one.get(0);
```

The return type is `Promise<ReadonlyMap<number, ShardStatsResult>>`. Import
`ShardStats`, `ShardStatsResult` and `ShardCallOptions` from `rilo` or
`rilo/sharding`. Entries follow the existing request result shape: `{ shard,
ok: true, value }` or `{ shard, ok: false, error }`. Errors are frozen `ShardError`
copies with a `code` and `message`; a failed entry has no `value` property.

## Freshness and scope

Every call makes new requests through the coordinator, including a request to
the caller's own shard. The destination reads its client and process state only
when that request arrives. Stats never use the coordinator's periodic scaling
metrics, an earlier successful result, or a local shortcut as a fallback.
The private request name `rilo:stats` is reserved and cannot be registered with
`handle()`.

Without an ID, the target set is `0..shardCount - 1` from the caller's reconciled
assignment when collection begins. It includes unavailable IDs. Passing an ID
selects only that shard; an invalid or out-of-range ID rejects with `TARGET`.
Dormant process slots are not shard IDs. A topology change during collection can
produce failures; call again after reconciliation to sample the new topology.

Samples are fresh observations, not a simultaneous cross-process snapshot. State
can change after a shard replies. `sampledAt` is Unix milliseconds on that shard's
clock, so differences between hosts can include clock skew. Successful entries
remain useful even when other shards fail; totals computed from them are partial.

The returned map has the read methods and iteration behavior of `ReadonlyMap`,
with no `set`, `delete` or `clear` methods. The map, entries, samples, nested memory
objects and errors are frozen. They are detached from live internals and will
not change after you receive them. The read-only map is a view over private
storage, not a mutable JavaScript `Map` instance. It is iterable; use
`[...results]` when you need an array. JSON serialization of errors should copy
their `code` and `message` explicitly.

## Deadlines and failures

The optional second argument accepts the usual `ShardCallOptions`:

```ts
const results = await client.sharding.stats(undefined, {
	timeoutMs: 5000,
	waitForCoordinator: true,
	signal: controller.signal,
});
```

One deadline covers coordinator waiting and the whole collection, including
queued targets. It defaults to the coordinator's `limits.timeoutMs` (15 seconds),
and accepts 1..300000 milliseconds. At most eight requests are in flight for one
collection, also subject to the existing client, host and coordinator pending
limits. A target still queued when the budget runs out receives `TIMEOUT`
without being dispatched. Late replies are ignored and never update a completed
map. A reply received after the budget expires is a timeout, even if it has metrics.

Before collection starts, invalid options or a locally unavailable coordinator
reject the promise. By default, maintenance and unmanaged clients reject with
`DISCONNECTED`; a closed client or host rejects with `CLOSED`. Opting into
`waitForCoordinator` waits within the same deadline and can reject with `TIMEOUT`,
`CAPACITY` or the supplied abort signal's reason. No local or cached stats are
returned while waiting. A connected host can still have children reconciling;
those destinations remain unavailable until their registration completes.

Once collection starts, failures become individual map entries:

| Code           | What happened                                                            |
| -------------- | ------------------------------------------------------------------------ |
| `UNAVAILABLE`  | The shard has no ready route, has exited, or has no stats provider.      |
| `TIMEOUT`      | The overall budget ran out before a usable reply arrived.                |
| `DISCONNECTED` | A required coordinator or host connection was lost.                      |
| `CAPACITY`     | A client, host, coordinator or destination handler limit was reached.    |
| `RESHARDING`   | The deployment is draining for a topology change.                        |
| `ABORTED`      | The caller cancelled collection. Already completed entries are retained. |
| `PROTOCOL`     | A responding shard returned a malformed stats sample.                    |
| `HANDLER`      | The destination's sampler threw an error.                                |

Other transport error codes can also appear. Failed entries contain no metrics:
an unavailable shard does not mean zero guilds, zero memory or a disconnected
Discord session. Calls already sent are never replayed after reconnection.
Collection does not change leases, maintenance, gateway sessions or dormant
process behavior. See [maintenance and recovery](sharding-recovery.md).

## Sample fields

| Field                         | Meaning                                                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `sampledAt`                   | Shard wall-clock sampling time, in Unix milliseconds.                                                            |
| `ready`                       | Whether the shard's Discord client is ready right now.                                                           |
| `guilds`, `users`, `channels` | Current local cache sizes. Users may appear on multiple shards.                                                  |
| `pingMs`                      | Most recent gateway heartbeat latency, or `null` before a measurement exists. This doesn't send a new heartbeat. |
| `uptimeMs`                    | Milliseconds since the client last became ready, or `null` while it isn't ready.                                 |
| `pid`                         | Process ID on that shard's host.                                                                                 |
| `processUptimeMs`             | Milliseconds since the Bun process started.                                                                      |
| `memory`                      | Process memory usage in bytes: `rss`, `heapTotal`, `heapUsed`, `external`, `arrayBuffers`. These values overlap. |

Cache counts depend on intents, cache configuration and received events; they
aren't a fresh Discord REST census. A process can answer stats while its Discord
client is not ready. That is a successful sample with `ready: false`, distinct
from a shard that cannot answer at all.
