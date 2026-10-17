# Breaking changes

## Virello rename

- The framework is now Virello, with package name `virello`. Replace `rilo`
  imports and subpath imports with `virello`; TypeScript declaration augmentation
  must target `virello`. Availability of the npm package name is unverified.
- Rename `RiloClient` and `RiloClientOptions` to `VirelloClient` and
  `VirelloClientOptions`. The previous names are no longer exported.
- Replace the `RILO_` prefix with `VIRELLO_` in environment variables and GitHub
  repository variables, including `VIRELLO_RELEASES` and
  `VIRELLO_TEST_REDIS_URL`.
- Upgrade coordinators, hosts and children together: transport headers and the
  reserved stats request now use `x-virello-*` and `virello:stats`.
- Redis task keys now use `virello:tasks:v1:`. Existing tasks under `rilo:tasks:v1:`
  are not read; drain or migrate them before switching. Branded symbols and
  pagination component IDs also use the new name, so avoid mixing framework
  versions in one application and recreate active pagination messages.
- The Rilo migration below describes the earlier Kairo-to-Rilo rename. When
  migrating directly from Kairo, apply both renames and use the Virello names.

## Rilo rename

- Install `rilo` and update all imports and subpath imports from `kairojs` to
  `rilo`. TypeScript declaration augmentation must target `rilo`.
- Rename `KairoClient` and `KairoClientOptions` to `RiloClient` and
  `RiloClientOptions`. The previous names are no longer exported.
- Replace the `KAIRO_` prefix with `RILO_` in environment variables and GitHub
  repository variables, including `RILO_RELEASES` and `RILO_TEST_REDIS_URL`.
- Upgrade coordinators, hosts and children together: transport headers and the
  reserved stats request now use `x-rilo-*` and `rilo:stats`.
- Redis task keys now use `rilo:tasks:v1:`. Existing tasks in the previous
  namespace are not read; drain or migrate them before switching. Branded
  symbols and pagination component IDs also use the new name, so avoid mixing
  framework versions in one application and recreate active pagination messages.

## Stricter utility types

- Loose value types now use `unknown`; narrow formatter values, translation
  dictionaries, and other untyped data before accessing their properties.
- `ok()` defaults its absent error type to `never`, `err()` defaults its absent
  value type to `never`, and `none` carries `never`. Supply explicit Result
  generics when a consumer needs a particular type for the absent branch.
- Constructor utility types accept arbitrary signatures as constraints. Supply
  the parameter tuple when invoking a value typed as `Ctor`, `AbstractCtor`,
  `Constructor`, or `AbstractConstructor`.
- `PaginatedFieldMessageEmbed.formatItems()` returns the same instance with the
  transformed item type. Continue chaining from that return value.
- Empty interfaces that only renamed another type are now aliases. Extend the
  alias or augment its underlying interface when adding application fields.
  `Tasks`, `ShardRequests`, and `DetailedDescriptionCommandObject` remain
  augmentable interfaces.

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
