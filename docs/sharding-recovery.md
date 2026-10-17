# Shard maintenance, leases and recovery

Each shard runs in its own Bun OS process. A `ShardManager` supervises its local
children and proxies their authenticated coordinator traffic. A child receives
only its own assignment and total count: no peer list, peer connections or
dependency on another shard's arrival. Coordination is entirely in memory.
There are no ownership files, state directories or persistent locks.

Fixed shard totals remain the default. Opt-in [automatic scaling](sharding-scaling.md)
retains its five-minute polling, three matching decisions and thirty-minute
cooldown defaults.

## Maintenance and bounded calls

A managed client starts with `client.maintenance === true`. A detected coordinator
connection loss immediately sets it back to `true` and keeps the existing Discord
session open. Socket closure is detected directly; a silent partition uses the
existing fifteen-second heartbeat deadline. Parent/child IPC heartbeats continue
through coordinator outages. Unmanaged clients default to `maintenance = false`.

Only authenticated control, an accepted lease, local assignment application and
coordinator registration clear maintenance. Opening a socket or receiving a
welcome is insufficient. Rilo does not install a command policy or send outage
replies: developers choose the response appropriate to each operation.

```ts
if (client.maintenance) {
	return interaction.reply(
		"Coordination is temporarily unavailable. Try again shortly.",
	);
}
```

Ordinary requests fail with `DISCONNECTED` while the local assignment is
unreconciled. Each request or broadcast can opt into bounded waiting:

```ts
const result = await client.sharding.request(0, "exampleStats", null, {
	waitForCoordinator: true,
	timeoutMs: 5000,
	signal: controller.signal,
});
```

The timeout includes waiting and execution; broadcasts share one overall deadline
across all targets. The default is `limits.timeoutMs` (15 seconds). Waits are
bounded by `limits.maxPending`, respect cancellation and return `TIMEOUT` or
`CAPACITY` instead of building an unlimited queue. Already dispatched calls fail
on disconnect and are never replayed. Waiting does not guarantee a destination
is available: routing can still return `UNAVAILABLE`, or `RESHARDING` during an
automatic scaling drain. Host manager calls support the same options.

Discord IDENTIFY still requires a coordinator permit. Control loss during a
permit wait waits for reconciliation within the shard's outage lifetime;
permit queue deadlines and exhausted allowance remain explicit failures.
An existing Discord session does not authorize new IDENTIFY calls offline.

## Leases and dormant processes

The coordinator maintains slots `0..shardCount - 1`. `workers[].shards` provide
initial placement preferences; leases determine actual ownership. `maxShards`
bounds new allocations per host, defaulting to its initial preference count
in fixed mode. Valid returning IDs are retained even if the host's configured
capacity was reduced during the outage. Allocation and lease installation are atomic, authenticated by
host credentials, supervisor instance and child generation. Duplicate sockets
for the same supervisor instance are refused. Different authenticated instances
can connect independently to reconcile their children or wait dormant.

A new/restarted process must obtain a valid assignment before opening Discord.
A returning process reports its previous ID. If valid and free, or already
reserved for that exact process, it keeps that ID. An invalid or taken ID is
refused: the child closes any old Discord session, forgets its ID
(`client.sharding.id === null`), warns clearly and becomes dormant. New processes
without capacity behave the same way.

Dormant children stay alive indefinitely with no Discord connection. They request
an assignment every `assignmentPollIntervalMs` (default 30,000), and open Discord
only after acceptance. Repeated full-capacity polls do not repeat the warning.
`client.login()` and transport-only `client.sharding.connect()` intentionally wait
for the first assignment. Ordinary coordinator RPC calls retain deadlines.

The host normally starts one child per initial placement. Optional `processCount`
sets a minimum local pool, including standby processes, within host capacity.
Scaling may require more children up to that capacity. Surviving processes are
reconciled independently, including IDs removed by a restarted coordinator.

`manager.processes` exposes a stable local `slot`, nullable leased `shard`, PID,
restart count and state. States include `maintenance` and `dormant`, alongside
`starting`, `running`, `backoff`, `failed` and `stopped`. Local slots are not
Discord shard IDs. Dormant clients remain in maintenance.

## Gateway changes and process lifetime

Recovery with the same ID and total preserves the Discord session. If the total
changed, the child closes its old gateway and reconnects with the accepted ID
and current total, even when the numerical ID is unchanged. RiloClient, modules
and application listeners stay alive. Assignment changes reset gateway resume
data and guild/channel/user caches. Extension login hooks run once per client;
Discord ready events may repeat. The gateway adapter targets discord.js 14.

A lost connection never releases a lease during the current coordinator lifetime.
Network loss is not proof of death. The owning supervisor must confirm the child
exited, including after reconnect, or release it after graceful shutdown/scaling.
Only then can an idle process acquire the slot. Another instance or generation
cannot release it. Lost first-lease replies and confirmed-exit acknowledgements
can be retried without stealing or releasing a replacement's assignment.

An assigned child has `maxDisconnectedLifetimeMs` (default 900,000: fifteen
minutes) to reconnect and reconcile. Failed connections, welcomes and failed
reconciliations never reset that timer. Success resets it for a future outage.
Expiry closes down and terminates the **entire shard process**; the existing host
restart/backoff policy applies. The host also bounds a stalled child's shutdown.
Dormant processes are exempt once their old Discord session is closed.

```ts
new ShardManager({
	id: "local",
	url,
	token,
	script,
	assignmentPollIntervalMs: 30_000,
	maxDisconnectedLifetimeMs: 15 * 60_000,
});
```

Polling accepts 50..300,000 ms; the outage lifetime accepts 1..2,147,483,647 ms.
`startupTimeoutMs` separately bounds boot, lease and local gateway application.
A gateway that cannot close/reconfigure is a process failure. `shutdownTimeoutMs`
bounds graceful exit. `reconnect: false` explicitly opts out of recovery and
stops children on loss. Hosts may start before the coordinator and retry with
capped backoff; closing the manager cancels the wait.

Parent IPC loss still terminates a responsive child, since it cannot reconnect
to a dead parent. Supervise each host's whole process tree. A new supervisor
instance cannot prove the old children died merely by presenting the same host
credentials. Their leases remain reserved for that coordinator lifetime; a
coordinator restart rebuilds the pool. No PID discovery or disk cleanup occurs.

## Coordinator restart tradeoff

Restart rebuilds zero-based slots from the currently required count (configured,
or the automatic scaling startup recommendation). Arrivals are admitted
independently, with **no global reconciliation grace period**.

An old partitioned Discord session may overlap a newly assigned replacement
until the old process reconnects or reaches its configured outage cutoff. If its
ID is taken on return, it closes Discord and becomes dormant. This policy cannot
promise zero duplicate processing or exactly-once delivery. A wedged process
needs host/service supervision to enforce termination. Run one coordinator per
bot; independent coordinators are not fenced from each other.

Use `botToken` in production. Each coordinator start waits 5.5 seconds before
fetching fresh `GET /gateway/bot` limits. This is an IDENTIFY cooldown, not a
reconciliation grace period. Permits are charged before sending and never refunded
on loss. An unexpired allowance cannot increase. `sessionStartLimit` is the
manual/offline alternative and needs a fresh snapshot on every start and expiry.
Restarting Rilo does not reset Discord's allowance.

Upgrade coordinator, hosts and children together: the internal protocol changed.
Restart running processes deliberately to load the new version. `statePath`,
`stateDirectory`, `releaseWorker`, `SHARD_STATE_PATH` and `SHARD_HOST_STATE_DIR`
remain removed. Legacy state files stay ignored and unused. See
[breaking changes](../BREAKING_CHANGES.md) and [examples](../examples/README.md).
