# Breaking changes

## Shard maintenance and coordinator reconciliation

- Upgrade coordinator, hosts and children together. The internal protocol now
  authenticates per-process leases and acknowledges assignment application.
- Coordinator loss retains children and Discord sessions in `client.maintenance`,
  with a default fifteen-minute unreconciled outage cutoff. `reconnect: false`
  retains its explicit stop-on-loss behavior.
- Fixed shard totals remain the default. `workers[].shards` are initial placement
  preferences; leases decide ownership. Distinct authenticated supervisor
  instances can connect together; duplicate sockets for one instance are refused.
- Disconnected leases remain reserved during the coordinator lifetime until the
  owner confirms exit/release. A new supervisor does not prove old children died.
  Restarting the coordinator rebuilds slots without a global grace period, which
  can allow overlapping old and replacement Discord sessions until recovery or
  the outage cutoff. There is no zero-duplicate-processing guarantee.
- Processes without capacity remain dormant, with no Discord session and
  `client.sharding.id === null`. They poll every thirty seconds by default.
  `login()` and transport-only `sharding.connect()` wait for the first assignment.
- Changed totals close the old gateway before reconnecting, even for the same ID.
  Assignment changes reset guild/channel/user caches and gateway resume data,
  preserving the client, modules and application listeners. Extension login hooks
  run once; Discord ready events may repeat.
- `ShardProcessStatus.shard` is nullable. `slot` identifies the local process
  position; `maintenance` and `dormant` are new states. Slots are not Discord IDs.
- Coordinator calls fail immediately by default. Use
  `{ waitForCoordinator: true, timeoutMs }` for a bounded wait. Broadcasts share
  one deadline across waiting and all targets. Dispatched calls are never replayed.
- Configure `assignmentPollIntervalMs`, `maxDisconnectedLifetimeMs`, and optionally
  a minimum standby `processCount` on `ShardManager`. Existing crash/backoff and
  opt-in automatic scaling policies remain. Reservations belonging to disconnected
  instances block scaling until reconciled or released.

Disk-backed ownership remains removed. No state migration is needed. See
[shard recovery](docs/sharding-recovery.md) for the full contract and supervision
boundary.
