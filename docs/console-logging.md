# Console logging

Virello uses actual `@lilsnibbi/logger` instances. The library draws the
timestamps, source names, severity markers, bars, badges, boxes and error trees.
Virello prepares safe message content and chooses native per-call display
options. It adds no console interception, logging service, dependency, buffer
or background timer.

At normal width, a gateway login reads as three distinct records:

```text
[Thu 16:45:45.709] ▌ → coordinator › Login queued · host=local shard=0 queued=1
[Thu 16:45:45.710] ▌ → coordinator › Login permitted · host=local shard=0 2.57s remaining=991
[Thu 16:45:45.710] ▌ ✓ coordinator › Login confirmed · host=local shard=0
```

Routine records no longer repeat a full date, component/event row, field grid,
trace heading and UUID block. Events are not buffered or merged: queueing,
granting and confirmation remain separate. Request dispatch and outcomes also
remain separate and keep their correlations in detailed text and JSON.

## Native display selection

| Output                         | Automatic presentation                                                                    |
| ------------------------------ | ----------------------------------------------------------------------------------------- |
| Routine terminal activity      | Native `bar`; `→` progress, `✓` successful milestones, `↻` assignment/recovery, `·` debug |
| Warnings                       | Native `badge` with `ALERT` severity                                                      |
| Terminal errors                | Native `box` containing the operation and the library's bounded error/cause tree          |
| Pipes and ordinary Docker logs | Plain native `badge` output, without ANSI or decorative blank lines                       |
| Very narrow displays           | Native `box` when a normal prefix would crowd out the message                             |
| JSON                           | One canonical object per line, without native text decoration                             |

The dependency's native severity names are `DEBUG`, `NOTIF` (info), `ALERT`
(warn) and `ERROR`. Human timestamps use the library's local-clock format;
JSON timestamps remain full ISO UTC timestamps. Human framework records use
concise native source names such as `coordinator`, `host`, `commands` and `jobs`.
The full application/component identity stays in detailed text and JSON.

Debug/info go to stdout; warnings/errors go to stderr. Native frames group one
failure and its causes together. Routine records have no blank separator.
Continuations wrap within the selected width. Escaped newlines in supplied
messages remain literal `\n` and cannot forge additional records.

## Configuration

| Variable             | Values                                                          | Default                                         |
| -------------------- | --------------------------------------------------------------- | ----------------------------------------------- |
| `VIRELLO_LOG_LEVEL`  | `debug`, `info`, `warn`, `error`; `notif`/`alert` also accepted | `info`                                          |
| `VIRELLO_LOG_FORMAT` | `text`, `json`                                                  | `text`                                          |
| `VIRELLO_LOG_DETAIL` | `compact`, `full`                                               | `compact`; `DEBUG` defaults to `full`           |
| `VIRELLO_LOG_LAYOUT` | `auto`, `badge`, `bar`, `box`                                   | `auto`                                          |
| `VIRELLO_LOG_STACKS` | `off`, `short`, `full`                                          | `short`                                         |
| `VIRELLO_LOG_WIDTH`  | Integer columns, `32`–`200`                                     | Terminal width capped at `120`; pipes use `100` |
| `NO_COLOR`           | Any defined value disables color                                | Unset                                           |
| `FORCE_COLOR`        | `0` disables; a nonempty value enables when permitted           | Unset                                           |
| `TERM`               | `dumb` disables color                                           | Unset                                           |

Invalid environment values fall back to defaults. Explicit `loggerOptions.level`,
`loggerOptions.layout` and `logging.format/detail/stacks/width` take precedence.
A native `box.width` is also supported. `COLUMNS` supplies a width when the stream
has no terminal column count. Destination width and color switches are checked
for framework events as they are emitted. `NO_COLOR`, `TERM=dumb`,
`FORCE_COLOR=0` and `colors: false` take precedence over enabling color. JSON is
always color free.

```ts
import { VirelloClient, createConsoleLogger, logEvent } from "virello/client";

const client = new VirelloClient({
	intents: [],
	loggerOptions: { layout: "bar", colors: "auto" },
	logging: { detail: "compact", stacks: "short", width: 100 },
});

const logger = createConsoleLogger(
	"MyBot",
	{
		level: "NOTIF",
		layout: "bar",
		symbols: { NOTIF: "✓", ALERT: "!" },
		theme: { name: { color: "cyan" }, errorName: { color: "red", bold: true } },
	},
	{ detail: "compact" },
);

logEvent(logger, "notif", {
	component: "jobs",
	event: "batch_finished",
	message: "Queued notifications have been processed.",
	context: { processed: 12, failed: 0 },
});
await client.destroy();
await logger.close();
```

`logEvent(logger, level, entry)` accepts `debug`, `notif`, `alert` or `error`.
A `ConsoleLogEntry` contains `component`, `event`, `message`, optional `context`
and the original thrown `error`. Put the operation and next step in the message.
Unknown application events keep that message; known framework milestones have
short display wording in compact mode. Full mode restores the original wording.

## Detailed records and collection

Set `VIRELLO_LOG_DETAIL=full` to inspect the original event message, full component,
every retained safe context field and complete request/connection/generation
identifiers. `VIRELLO_LOG_LEVEL=debug` additionally enables frame and module
metadata and defaults to full detail unless compact detail was explicitly chosen.
No wire bodies are included. Compact request/warning records may show an
eight-character `ref`; use the full ID from detailed text or JSON for tracing.

```powershell
$env:VIRELLO_LOG_LEVEL = 'debug'
$env:VIRELLO_LOG_DETAIL = 'full'
$env:VIRELLO_LOG_FORMAT = 'json'
bun --env-file=examples/.env examples/coordinator.ts
```

JSON keeps the established schema: `timestamp`, `level`, `component`, `event`,
`message`, and optional `context`/`error`. Compact display choices never remove
fields from JSON. Native layouts, themes and text width do not decorate or wrap it.
A broadcast has one request per destination shard. Use `requestId` to pair
dispatch/outcome and `routeId` to follow a destination invocation; connection IDs
change after reconnects.

## Native options, files and compatibility

`Logger`, `LoggerOptions` and `LogLevel` still come directly from the dependency.
`LogLayout`, `LogCallOptions`, `LogBoxOptions`, `LogFileOptions`, `LogTheme` and
`LogStyle` are also available from `virello` / `virello/client`.

Native `layout`, `box` corners, `symbols`, `theme`, `timeformat`,
`includeTimestamps`, `filter`, `transport` and file options work with built-in safe
records. Per-call overrides do not mutate the shared logger or caller settings.
Theme changes through `setTheme()` remain effective, including error/stack tokens.
The native `name`, `level`, `silent`, `child()`, raw rendering, `divider()`,
`time()`, `timeEnd()`, `flush()` and `close()` APIs remain available. The framework
does not add dividers to machine-readable output.

```ts
const logger = createConsoleLogger(
	"MyBot",
	{
		level: "NOTIF",
		file: {
			directory: "logs",
			filename: "bot",
			level: "DEBUG",
			rotate: "daily",
			maxSize: 5 * 1024 * 1024,
			maxFiles: 7,
			json: true,
		},
	},
	{ detail: "compact" },
);
```

Text file sinks retain full safe detail even when console presentation is compact.
`file.level` can retain debug records filtered from the console. `file.json` keeps
the dependency's native envelope (`time`, `level`, `name`, `message`); parse its
`message` string as JSON for the canonical Virello record. The native transport
receives a plain rendered line and a record whose `value` is the full sanitized
Virello record. Filters still run before formatting. File ownership, rotation,
flushing and closing stay with the dependency.

An explicit `format` / `serialize` hook or native `inspectDepth` / `relativePaths`
serialization control selects the dependency's original formatting contract and
owns redaction/presentation. Passing `new Logger(...)`
directly also retains native behavior. The exported helpers are available on
`virello/engine` without importing Discord.js or changing the engine runtime.

Supplying `logger` to a client, coordinator or host preserves that exact instance,
its settings, method binding and ownership; Virello never configures or closes it.
Custom loggers still need only `debug`, `notif`, `alert` and `error`. They receive
one contextual string for notices or one contextual `Error` whose `cause` is the
original thrown value. User error callbacks, events and their arguments are
unchanged. A synchronous sink failure attempts one safe fallback record and
cannot interrupt startup, retries or cleanup.

## Operational coverage

- Readiness and completed registration stay visible. Identical command
  definitions, loading progress and per-module traces remain debug. Changed
  commands and registration failures retain their existing policy and severity.
- Coordinator listening, connections, shard registration/offline changes, login
  queue/grant/confirmation, request dispatch/outcomes and graceful host shutdown
  keep their distinct events. Authentication, capacity, cancellation and timeout
  failures retain their reasons and codes.
- `connection_waiting` describes cancellable waits for coordinator availability
  or an active duplicate host. `identify_startup_wait` reports the startup login
  cooldown; `host_drained` confirms that a host stopped its shards.
- Gateway/REST, extensions, loaders, jobs/storage, localisation and pagination
  use the same built-in presentation. Routine job ticks and job data remain
  omitted. Error records identify the failing operation and actionable remedy.
- Raw close reasons, tokens, headers, payloads, results and provider error
  messages are not printed. Existing trace controls and custom callbacks remain
  effective.

Logging does not change engine, permissions, rate limits, retries, registration,
sharding, scheduling or shutdown behavior. Child stdout/stderr remain inherited.
See [sharding restarts](sharding-recovery.md) for connection-scoped ownership,
in-memory identify scheduling and process-supervision limits.

## Redaction and bounds

Recognized error type, code/status, actionable hints, causes and aggregate counts
remain available. Provider messages, arbitrary error properties, request/response
bodies, stack header text and function labels are omitted. The library's native
error formatter receives a sanitized bounded error tree, not the provider object.

`short` keeps up to three source locations outside dependencies; `full` keeps up
to ten including dependencies; `off` omits locations. Compact warning records
omit routine stack locations; error records retain them. Full detail includes
the locations selected by the stack setting. Causes are bounded to two levels;
aggregates retain counts and at most three children at each level.

Private metadata is recursively redacted. Numeric token counts remain useful.
Configured credential values and encoded variants are scrubbed; values shorter
than six characters are ignored to avoid erasing ordinary words. HTTP/WS URLs
retain only their origin; database URLs, webhook/interaction secrets, queries,
authorization values, email addresses and user content are removed. Controls and
terminal escapes are removed before native theme styling.

Messages and strings are capped at 320 characters. Context shares a 1,536-character
budget, 80 nodes, 24 fields per object, three levels and eight array entries.
Correlation fields are prioritized before unrelated metadata. JSON and built-in
human records stay within 8 KiB; extreme detail is marked as truncated. Native
wrapping counts Unicode display cells and preserves theme escape sequences.

## Preview and verification

The demo uses the same built-in native logger as actual framework events:

```sh
bun scripts/logging-demo.ts --width=100
bun scripts/logging-demo.ts --width=64 --layout=bar
bun scripts/logging-demo.ts --layout=box --color
bun scripts/logging-demo.ts --full
bun scripts/logging-demo.ts --json
```

For comparison, the former human login output spent roughly eight or more lines
per stage on a message, date/component/event, counts and full UUIDs. The three
native compact records at the top retain the distinct stages in three lines at
100 columns. Detailed text and JSON keep the original messages and correlations.
The demo is synthetic and never constructs a client or contacts Discord.

```sh
bun test tests/core/logging.test.ts tests/core/loggingLayout.test.ts
bun test tests/sharding/activity.test.ts tests/sharding/consoleLayout.test.ts
```

Tests cover native layouts/options/themes, compact versus detailed output,
file/transport semantics, redaction, error trees, Unicode/width/byte bounds,
colors, pipes and frozen custom loggers. Actual coordinator/host entrypoints
run against disposable loopback state at 64 and 100 columns; their gateway
metadata is supplied by a test-only preload. No live Discord failure is provoked.
