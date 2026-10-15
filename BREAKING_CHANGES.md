# Migration to the current KairoJS API

KairoJS runs raw TypeScript on Bun 1.4.2 or newer. The package exports `types` and `bun` conditions and does not provide a Node.js build.

## Console output

Framework-created loggers now emit UTC ISO timestamp/severity/component/event/context records. `NOTIF`/`ALERT` render as `INFO`/`WARN`; default errors omit arbitrary messages/bodies and bound causes/stacks. Registration progress moves to debug, and definition differences retain paths instead of original/expected data. Standalone localisation diagnostics use stderr log records instead of process warnings. Update text log parsers or select `KAIRO_LOG_FORMAT=json`; see [console logging](docs/console-logging.md).

The four-method `LoggerLike` contract, public `Logger` class, supplied logger identity/ownership, custom formatter settings and original error event arguments remain compatible. New optional `logging` client options and `createConsoleLogger` configure framework console output. Custom loggers receive a contextual string or an `Error` with the original cause. The Biome package script is now `lint:check` so `bun check` invokes Bun's native type checker; `typecheck` delegates to `bun check`. Development and CI pin Bun 1.4.3, which provides that checker; the runtime minimum stays unchanged.

## Client and module startup

- Supply `root` and explicit glob patterns through `modules`, for example `modules: { commands: 'commands/**/*.ts' }`. There is no implicit directory scan or `baseUserDirectory` option.
- Configure built-ins through `extensions.localisation`, `extensions.scheduledtasks`, `extensions.patternCommands`, `extensions.subcommands` and `extensions.services`. Each defaults on and accepts `false` to disable it. Custom extension classes go in `extensions.custom`.
- Replace the former `plugins`, top-level `tasks` and `i18n` options. Use `extensions.scheduledtasks.logErrors`, `extensions.subcommands.logErrors` and `extensions.subcommands.defaultCooldown` for the corresponding former top-level settings.
- `load()` takes a startup snapshot. Restart after editing module files, globs or translations; the former `hmr` and `api` options are unsupported.
- Await `destroy()` before constructing another client. The client owns registered disposers and module cleanup; a supplied logger remains owned by its caller.
- Import supported APIs from `kairojs` or the documented category paths. Keep module augmentation on `kairojs`; internal file paths are not package exports.

The [example bot](examples/README.md) demonstrates the current configuration.

## Scheduling

Scheduling uses an in-memory queue by default. Set `extensions.scheduledtasks.redis_url` explicitly to use a persistent Redis queue. Ambient `REDIS_URL` does not select Redis, and a failed Redis connection does not switch to memory.

Use the native task options (`delay`, `repeated`, `interval` or `pattern`, `timezone`, `jobId`, `attempts`, `retryDelay`, `removeOnComplete` and `removeOnFail`). BullMQ job options and storage formats are unsupported. Repeated jobs require `repeated: true` and either an interval or a cron pattern. Cron defaults to UTC.

Payloads must be acyclic JSON data. Accessors, symbol or hidden object fields, sparse arrays, additional array properties, class instances and non-finite numbers are rejected. This prevents silent data loss between memory and Redis. Top-level `undefined` represents a task without a payload.

## Localisation and sharding

Localisation loads JSON at startup from configured resource directories or `i18next.resources`. Translation backends, resource writes and hot reloading are unsupported.

KairoJS shard coordination has its own authenticated protocol and persistent ownership state. It is incompatible with upstream discord-sharding databases and transports. Use the provided coordinator and host examples, assign every shard exactly once and retain the coordinator state file between restarts.

## Experimental engine subpath

`kairojs/engine` adds the independent Bun engine without changing the root API or existing KairoClient runtime. Native payloads and request bodies use discord-api-types 0.38.56. See [engine contracts and migration plan](docs/engine.md); this API is an explicit experimental milestone.
