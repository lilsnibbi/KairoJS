# Console logging

Framework-created loggers share a UTC timestamp, severity, component, event and
optional context. They use the existing `@lilsnibbi/logger` formatting hooks and
its stream selection and level filtering. There are no new dependencies, timers,
log buffers, global console interception or changes to `Error.stackTraceLimit`
by default.

```text
2026-10-15T12:30:45.123Z INFO  KairoJS.client ready | Discord connected; this client can now handle events. | shard=0 commands=7 guilds=12 shards=1
2026-10-15T12:30:45.123Z ERROR KairoJS.tasks task_failed | Scheduled task execution failed; inspect this task's run handler. | task=fixture path=tasks/fixture.ts | error={"type":"TypeError","hint":"Inspect the failing operation and source locations."}
```

Debug/info use stdout; warnings/errors use stderr. Color is restrained and checks
the destination stream's TTY status. Redirected output, ordinary Docker logs and
JSON have no ANSI escapes by default. Multiline message text becomes literal
`\n`; only bounded stack continuation rows occupy additional lines.

## Configuration

Namespaced settings avoid taking over an application's own `LOG_*` variables.
Level, format, stacks and credential values are captured when the logger is created.
Color environment switches are checked at each output call.

| Variable | Values | Default |
| --- | --- | --- |
| `KAIRO_LOG_LEVEL` | `debug`, `info`, `warn`, `error`; legacy `notif`/`alert` also accepted, case insensitive | `info` |
| `KAIRO_LOG_FORMAT` | `text`, `json` | `text` |
| `KAIRO_LOG_STACKS` | `off`, `short`, `full` | `short` |
| `NO_COLOR` | Any defined value disables color | Unset |
| `FORCE_COLOR` | `0` disables; a nonempty value enables when permitted | Unset |
| `TERM` | `dumb` disables color | Unset |

Invalid environment settings fall back to defaults. `NO_COLOR`, `TERM=dumb`,
`FORCE_COLOR=0` and `loggerOptions.colors=false` take precedence over color
enabling. JSON always remains color free.

```ts
import { KairoClient, createConsoleLogger } from 'kairojs/client';

const client = new KairoClient({
	intents: [],
	loggerOptions: { level: 'DEBUG', colors: false },
	logging: { format: 'json', stacks: 'short', redact: ['fixture-credential'] }
});

const logger = createConsoleLogger('MyBot', { level: 'NOTIF' }, {
	format: 'json',
	stacks: 'off'
});
logger.notif('Application initialized.');
logger.error(new Error('Provider content is omitted from default diagnostics.'));
await client.destroy();
```

For application events, use the same records as the framework:

```ts
import { createConsoleLogger, logEvent } from 'kairojs/client';

const logger = createConsoleLogger('MyBot');
logEvent(logger, 'notif', {
	component: 'jobs',
	event: 'batch_finished',
	message: 'Queued notifications have been processed.',
	context: { processed: 12, failed: 0 }
});
```

`logEvent(logger, level, entry)` accepts `debug`, `notif`, `alert` or `error` and a
`ConsoleLogEntry` with `component`, `event`, `message`, optional `context` and
`error`. Use `error` for the original thrown value; write the operation and next
step in `message`. The helper and `ConsoleLogEntry` type are exported from
`kairojs`, `kairojs/client` and `kairojs/engine`. The engine subpath keeps its
independent runtime and does not load Discord.js just to write a log record.

`loggerOptions.level` overrides `KAIRO_LOG_LEVEL`; `logging.format` and
`logging.stacks` override their environment settings. `logging.redact` adds exact
credential values to the default scrubber, which also reads credential-like
environment keys. Values shorter than six characters are ignored to avoid
destroying normal words. Shard coordinators/managers use these environment
defaults too; supply `logger: createConsoleLogger(...)` for explicit settings.
The engine's existing `onError` callback remains its customization mechanism.

## Compatibility and customization

The public `Logger`, `LoggerOptions` and `LogLevel` exports still come directly
from `@lilsnibbi/logger`. Framework defaults are instances of that same class;
`name`, `level`, `silent`, raw rendering and `close()` remain available. Supplying
`logger` preserves the exact instance, method binding and ownership, and ignores
`loggerOptions`/`logging`. KairoJS never configures or closes a supplied logger.

Custom loggers still need only `debug`, `notif`, `alert` and `error`. Framework
notices arrive as a single string with component/event/context. Failures arrive
as a single contextual `Error` whose `cause` is the original thrown value.
Application error events, their arguments and error objects are unchanged.
Framework log calls contain synchronous sink exceptions and attempt one safe fallback record;
those exceptions cannot interrupt startup, retries or cleanup. Direct calls to a supplied
logger keep that logger's behavior. The public `logEvent` helper uses this same
compatibility path, including the original error cause and sink-failure guard.

Explicit output customization in `loggerOptions` retains the dependency's
original behavior. This includes `format`, `serialize`, `layout`, `box`, `file`,
`theme`, `timeformat`, `includeTimestamps`, `inspectDepth`, `relativePaths`,
`symbols`, `dividerWidth`, `filter` and `transport`. Providing any of these
selects the original dependency formatter; `logging` settings then do not apply.
This preserves existing custom hooks, rotating files and JSON file envelopes.
That custom output and supplied logger instances remain responsible for their
own redaction, bounds and color policy. The default guarantees below apply to
the KairoJS console formatter. Passing the public `new Logger(...)` directly
continues to select the dependency's original behavior.

## Operational events

- Client readiness and command registration completion are info milestones.
  Registration progress, identical definitions, module counts and per-module
  traces are debug. `traceModules`, `logRegistrations` and `logErrors` keep their
  existing controls. Command comparison timings and repeated pre-operation
  notices are omitted.
- REST registration failures carry command/guild context and recognized HTTP
  status/Discord codes. Changed commands and bulk overwrites stay visible.
  Difference diagnostics keep bounded field paths instead of dumping original
  and expected command definitions when verbose differences are available.
  `LogToConsole` explicitly says that it will leave Discord unchanged; overwrite
  reports the completed update with its command ID and scope. Names accepted in
  ID-routing helpers produce advice without implying bad intent. There is no
  per-request REST tracing.
- Engine fallback failures carry source, fatal state and shard ID. User `onError`
  callbacks and gateway events retain their existing calls and arguments. Standalone
  REST calls still return/throw through their existing API; logging stays at the
  operation boundary so one failure is not printed at every retry. Gateway
  recovery, fatal closure, event-handler failure and handler-capacity exhaustion
  have different messages, with engine state and pending-handler counts.
- Sharding includes coordinator connection activity, shard availability, login
  permits and request outcomes, plus host/shard correlation. Child-process
  stdout/stderr remain inherited. IPC payloads and tokens are not dumped.
- Extension failures carry extension and lifecycle phase. Module failures carry
  store and source. Scheduled tasks carry task/module or queue/storage context;
  storage recovery remains info. Required extension failures explain why startup
  stops; optional failures explain that the extension is disabled. Task-storage
  messages distinguish claiming work from saving its result, where an expired
  lease can allow another execution. Routine job ticks and job data are omitted.
- Localisation fallback and pagination failures use the same operational format.
  Standalone localisation fallback now writes a warning record to stderr instead
  of a process warning; custom `onDiagnostic` callbacks are unchanged.

Severity and formatting do not change engine, permissions, rate-limit, retry,
registration, sharding, scheduler or shutdown behavior. Existing errors still
propagate through their existing APIs. Consumer-owned logs, Discord.js internals,
CLI validation output and application logs are not intercepted. The supplied
[examples](../examples/README.md#console-messages) use `logEvent` explicitly.

## WebSocket server activity

The sharding coordinator records activity at the operation boundary by default.
The real `examples/coordinator.ts` entrypoint uses these records; no separate
demo logger or option is needed.

| Level | Events and meaning |
| --- | --- |
| Info | `listening`, `host_connected`: listener readiness, successful authentication, assignment list/count and whether ownership was resumed |
| Info | `shard_registered`, `shard_offline`: the host registered a shard process for RPC routing or took it offline; this is separate from Discord gateway readiness |
| Info | `identify_limits_updated`, `identify_queued`, `identify_granted`, `identify_completed`: effective remaining login allowance and permit lifecycle |
| Info | `request_dispatched`, `request_completed`, `request_cancelled`: request destination, result completion or caller cancellation |
| Info | `ownership_released`, normal `host_disconnected`, `stopping`, `stopped`: ownership and listener cleanup |
| Warn | `authentication_rejected`, `upgrade_rejected`, `request_rejected`, `request_failed`, `request_timed_out`, `identify_failed`, `identify_timed_out`, `send_failed` and unexpected host disconnects |
| Error | `startup_failed`, `protocol_rejected`, `identify_persistence_failed`, `gateway_metadata_refresh_failed`: startup, protocol or coordination failures |
| Debug | `frame_received`, `frame_sent` (including heartbeat ping/pong), `late_result_ignored`, `upgrade_rolled_back`, startup/limit-refresh details |

An exhausted or expired login allowance is reported at warn. Authenticated
upgrade rejections include a fixed reason such as `host_already_connected` or
`ownership_reserved`, without echoing submitted headers or identities.

Each accepted WebSocket gets a server-generated `connectionId`, which changes
on reconnect. Request records carry the source `host`/`connectionId`, original
`requestId`, destination `routeId`, `destinationHost`/`destinationConnectionId`,
target `shard`, `generation`, operation name, deadline and elapsed `durationMs`.
Use `requestId` to pair dispatch with the terminal outcome, then use `routeId`
to follow the destination invocation. A broadcast produces one request per shard.

Disconnect records contain a fixed reason, numeric close code when available,
ready-shard/pending counts and `ownershipRetained`. Raw close reasons, incoming
authorization headers, unknown host-header values, payloads, result values and
remote error messages are omitted. Configured host secrets and the Discord token
are scrubbed from selected metadata even with a caller-supplied logger. Existing
original-error causes on diagnostic errors remain available to custom loggers.
Assignment arrays use the formatter's normal bounds and retain their full count.

`KAIRO_LOG_LEVEL=debug` adds frame metadata, never wire bodies. Use
`KAIRO_LOG_FORMAT=json` for collecting correlated records. `KAIRO_LOG_LEVEL=warn`
keeps warnings/errors while suppressing routine activity. These are log filters;
they do not alter routing, heartbeat deadlines, authentication, login permits,
ownership or retry behavior. Cancellation records describe a cancellation
request, not proof that a destination callback has finished.

Excerpt from a real `bun examples/offline.ts` run, with IDs shortened and some
context omitted here for readability:

```text
2026-10-15T02:49:29.111Z INFO  Example.sharding.coordinator host_connected | Authenticated host connected; sending its shard assignments. | host=local connectionId=364fe221... shards=[0,1] assignedCount=2 resumedOwnership=false
2026-10-15T02:49:29.979Z INFO  Example.sharding.coordinator request_dispatched | Dispatched a shard request to its destination host. | requestId=303bc924... shard=0 host=local connectionId=364fe221... routeId=01d3c657... operation=exampleStats timeoutMs=5000
2026-10-15T02:49:29.985Z INFO  Example.sharding.coordinator request_completed | Shard request completed. | requestId=303bc924... shard=0 host=local connectionId=364fe221... routeId=01d3c657... operation=exampleStats durationMs=6
```

`bun test tests/sharding/activity.test.ts tests/sharding/coordinator.test.ts`
checks real loopback WebSockets, including the actual coordinator entrypoint in
separate processes. Its Discord gateway metadata is supplied by a test-only
preload; no live Discord request is made. Tests cover info/debug filtering,
correlation, credential/body omission, custom sinks, authentication/ownership,
requests, timeouts, heartbeat expiry and shutdown.

## Diagnostics, redaction and bounds

Error records retain recognized type, code/status, an actionable hint, causes
and aggregate counts. Arbitrary provider messages, response/request bodies,
error properties, function labels and stack header lines are omitted. Unrecognized
codes use a generic hint. Code-specific source locations and operation context
are the way to investigate details; custom error callbacks still receive the
original errors.

`short` keeps up to three source locations outside dependencies; `full` keeps up to ten
including dependencies; `off` omits them. Consumer modules outside `src` retain
their locations, and files under the working directory use relative paths.
Text continuation rows repeat timestamp,
severity, component, event and request/trace/shard/host correlation. JSON stores
locations inside the same record's `error.stack`. Cause depth is two; aggregates
show at most three children at each level and keep the original child count.

Private metadata keys are redacted recursively, including credentials, tokens,
cookies, sessions, headers, bodies, payloads, prompts, arguments, content,
responses, email addresses and usernames. Numeric token counts remain useful.
Known credential values and encoded variants are scrubbed from text. HTTP/WS URLs
retain only their origin; database/Redis URLs, webhook/interaction route secrets,
query values, authorization values and email addresses are removed. Control
characters and terminal escapes cannot inject extra rows.

Messages and strings have a 320-character cap. Context has a shared 1,536-character
budget, 80 nodes, at most 24 fields per object, three levels and eight array entries
plus a truncation marker. Getters and `toJSON` are ignored; cycles and unavailable
objects are marked. Records are bounded to 8 KiB in UTF-8, shedding optional
details while retaining correlation. Redaction is a backstop: pass fixed
developer-authored messages and diagnostic metadata, never arbitrary user text.

JSON produces one parseable object per line:

```json
{"timestamp":"2026-10-15T12:30:45.123Z","level":"info","component":"KairoJS.client","event":"ready","message":"Discord connected; this client can now handle events.","context":{"shard":0,"commands":7,"guilds":12,"shards":1}}
```

## Synthetic before/after and local demo

Previously routine registration progress and errors mixed free text, stacks and
definition dumps:

```text
[Wed 12:30:45.123] NOTIF KairoJS > ApplicationCommandRegistries: Initializing...
[Wed 12:30:45.123] NOTIF KairoJS > ApplicationCommandRegistries: Took 18ms to initialize.
[kairo-engine] gateway recoverable provider-specific details ...
Encountered error on scheduled task "fixture-task" at path "/app/tasks/fixture.ts"
Error: provider-specific details ...
    at ...
```

The replacement combines safe diagnostics with the operation and bounds stacks:

```text
2026-10-15T12:30:45.123Z INFO  KairoJS.rest.registration completed | Command registration pass finished. | registries=7 durationMs=18
2026-10-15T12:30:45.123Z INFO  KairoJS.client ready | Discord connected; this client can now handle events. | shard=0 commands=7 guilds=12 shards=1
2026-10-15T12:30:45.123Z ERROR KairoJS.engine.gateway operation_failed | Gateway connection interrupted; inspect transport diagnostics while recovery proceeds. | shard=1 fatal=false state=reconnecting pendingHandlers=0 | error={"type":"Error","code":"ECONNREFUSED","hint":"Connection refused; check the endpoint and service availability."}
2026-10-15T12:30:45.123Z ERROR KairoJS.engine.gateway operation_failed | at src/engine/client/EngineClient.ts:42:3 | shard=1
```

The message content itself also changes from the first console-format redesign
(`ea9951b`); these are synthetic examples of the same operations:

| Previously logged | Now logged |
| --- | --- |
| `Discord client ready.` | `Discord connected; this client can now handle events.` with shard, command and guild counts |
| `Application command registries initialized.` | `Command registration pass finished.` with registry count and elapsed time; this does not claim every operation succeeded |
| `Command definition differs; review its definition and overwrite behavior.` | `Discord command differs from local code; this registration is configured to report differences without updating Discord.` for report-only registrations |
| `Updated command fixture (...) with new api data` at debug | `Updated a Discord command to match its local definition.` at info, with command ID and scope |
| A name was used while `trying to bypass this warning` | `Expected a numeric Discord command ID; accepted this value as a name alias. Use addChatInputCommandIds with a real command ID.` |
| `Skipping extension: setup failed.` | `Required extension setup failed; client startup cannot continue.` or a separate optional-extension cleanup message |
| `Engine operation failed.` | `Gateway connection interrupted; inspect transport diagnostics while recovery proceeds.` for recoverable gateway failures |
| `Scheduled task failed.` | `Scheduled task execution failed; inspect this task's run handler.` |
| `Shard process exited.` | `Shard process ended unexpectedly; applying the configured restart policy.` with exit code and restart settings |
| Example `Shard 0 ready as ...` plus framework readiness | One info readiness record; the example cache listener is debug and omits the account tag |

Messages, severity choices and some diagnostic event names have changed. Use
`component` and `event` in structured collectors, and update filters for the
specific operation names in the demo rather than matching free text. Application
error callbacks still receive the original error objects.

Preview synthetic text or JSON without contacting Discord or Redis:

```sh
bun scripts/logging-demo.ts
bun scripts/logging-demo.ts --json
```

The preview deliberately includes debug samples and fixed UTC timestamps. It
uses stdout/stderr like the real logger; combine them with `2>&1` to collect all
sample records. Logging and message-content checks run with:

```sh
bun test tests/core/logging.test.ts tests/integration/consoleMessages.test.ts
```
