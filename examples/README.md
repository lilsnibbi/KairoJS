# The example bot

This is one working bot, split into a coordinator, a host and the bot processes it starts. It has three slash commands, a ready listener and typed messages between shards. Start here if you want to see how the pieces fit together.

## What's running?

```text
coordinator.ts     Keeps track of hosts, routes messages and spaces out logins
      |
   host.ts        Starts and watches the bot processes on this machine
      |
      +-- bot.ts  Shard 0: its own Discord connection and server cache
      +-- bot.ts  Shard 1: its own Discord connection and server cache
```

A shard is a separate connection that handles part of your bot's servers. Every shard runs the same code, but each has its own memory. `/stats` asks all shards for their numbers and adds them up, rather than assuming one process can see everything.

The default setup runs two shards on one machine. A small bot doesn't need two shards, but it's handy for trying the setup; `SHARD_COUNT=1` works too.

## Get it running

Run these commands from the **repository root**, using Bun 1.4.3 or newer.

1. Install dependencies:

   ```sh
   bun install --frozen-lockfile
   ```

2. Copy `examples/.env.example` to `examples/.env`. In PowerShell:

   ```powershell
   Copy-Item examples/.env.example examples/.env
   ```

3. Put your bot token in `DISCORD_TOKEN`. Generate a separate host secret:

   ```sh
   bun -e "console.log(crypto.randomUUID() + crypto.randomUUID())"
   ```

   Paste the output into `SHARD_HOST_TOKEN`. This authenticates the host to the coordinator; it isn't your Discord token. Both processes need the same value.

4. Optionally set `DEV_GUILD_ID` to your test server's ID. Blank means global commands. Install the bot in your server with the `bot` and `applications.commands` scopes. These examples use slash commands and the Guilds intent; they don't need message content or member intents.

5. Start the coordinator in terminal one:

   ```sh
   bun --env-file=examples/.env examples/coordinator.ts
   ```

6. Once it reports `Coordinator is accepting authenticated host connections.`
   with the configured port and shard count, start the host in terminal two:

   ```sh
   bun --env-file=examples/.env examples/host.ts
   ```

The host starts `bot.ts` for each assigned shard. Don't run `bot.ts` directly or set `KAIRO_SHARD` yourself. Wait for each shard's ready message, then try the commands in Discord. The coordinator may space out logins, so the shards won't always become ready together.

## Try the commands

| Command | What it does |
| --- | --- |
| `/ping` | Replies from the shard handling this interaction, including gateway ping |
| `/stats` | Broadcasts a request to every shard and reports server counts, memory and uptime |
| `/shard id:1` | Requests the same stats from one shard; IDs start at 0 |

Replies are only visible to the person who ran the command. A failed shard appears as unavailable in `/stats`; totals cover the shards that responded. Requests time out after five seconds.

Every shard loads the commands. `registration.ts` lets only shard 0 write command registrations, so the processes don't race to update the same commands. Commands still run on every shard. Changing `DEV_GUILD_ID` doesn't delete registrations from the old scope, so switching between server and global commands can leave old entries behind.

To delete all global commands and all commands in `DEV_GUILD_ID`, stop the host and run:

```sh
bun --env-file=examples/.env examples/unregisterCommands.ts
```

The script uses `DISCORD_TOKEN` to find the application. If `DEV_GUILD_ID` is blank, it clears only global commands. Starting the host again registers the example commands.

## Where to change things

- `commands/`: add another command by extending `Command`. The filename supplies its name.
- `listeners/ready.ts`: a debug example of inspecting the gateway cache; the framework emits the info readiness message.
- `client.ts`: intents, module paths and the `exampleStats` request handler.
- `contracts.ts`: the input/output types for messages between shards. Payloads must be plain JSON.
- `stats.ts`: turns shard results into a readable Discord reply and separate console counts.
- `logging.ts`: the shared per-process logger and safe startup-failure reporting.
- `shutdown.ts`: signal handling and cleanup diagnostics.
- `config.ts`: reads and checks configuration; failures name the setting without printing its value.

For example, to ask shard 1 for its stats from another command:

```ts
const stats = await this.container.client.sharding.request(
    1, 'exampleStats', null, { timeoutMs: 5000 }
);
```

Use `broadcast('exampleStats', null)` to ask every shard. Each result has an `ok` flag: successful entries contain `value`; failed entries contain `error`. Check it before using the response.

Restart the host after editing bot code. Stop the host first, then the coordinator, with Ctrl+C. A normal host shutdown stops its children and releases its assignment. Child crashes are retried with backoff; repeated crashes eventually stop that shard, so check the logs.

## Console messages

The framework and example code share one `createConsoleLogger('Example')` per
process. Coordinator listening and host assignment come from the framework.
The coordinator also reports authenticated connections, shard registration and
offline changes, login permits, request dispatch/results and ownership cleanup
at info. Each connection has a `connectionId`; dispatch and outcome records
share `requestId` and `routeId`, with the source/destination host and elapsed time.
Authentication, capacity and timeout failures include fixed reasons/codes.
Headers, secrets, request payloads and result bodies are omitted.

Each live bot emits one info readiness message after the registration pass,
with its shard, command and guild counts. The ready listener adds a debug cache
record. It no longer repeats readiness with the bot's account tag.

Example commands use `logEvent(this.container.logger, level, entry)` so supplied
loggers still work. A failed `/shard` request names the requested shard and
interaction ID. A partial `/stats` broadcast logs the number of responding
shards and the failed shard IDs/codes while keeping the Discord reply unchanged.
Errors retain their original cause for custom loggers; default output omits
arbitrary provider messages and bounds the stack.

Missing configuration reports a setting such as `SHARD_HOST_TOKEN` and how to
set it. Startup failures release any constructed resources. Ctrl+C/SIGTERM
reports shutdown requested, then completion or a cleanup failure; a failed
startup or cleanup sets a nonzero exit status.

Use `KAIRO_LOG_LEVEL=debug` for frame operations and heartbeat ping/pong metadata,
`KAIRO_LOG_FORMAT=json` for one record per line, and `KAIRO_LOG_STACKS=off` to omit
source locations. See [console logging](../docs/console-logging.md) for all
options and synthetic old-versus-new samples. To supply your own logger, pass
it to `createBot(logger)` in `client.ts`; KairoJS keeps that instance.

For detailed coordinator diagnostics in PowerShell:

```powershell
$env:KAIRO_LOG_LEVEL = 'debug'
$env:KAIRO_LOG_FORMAT = 'json'
bun --env-file=examples/.env examples/coordinator.ts
```

Info is the default and includes normal activity; debug adds frame metadata
without wire bodies. Set the same variables in the host terminal when you also
need host/child details. Run `coordinator.ts` in one terminal and `host.ts` in the
other. An existing process keeps its loaded code; the old plain
`Coordinator listening at ...` message indicates an older checkout/process.

## Environment settings

| Variable | Meaning |
| --- | --- |
| `DISCORD_TOKEN` | Same bot token on the coordinator and each host |
| `DEV_GUILD_ID` | Optional server ID for command registration; set the same value on every host |
| `SHARD_COUNT` | Total shards, default `2`; set on the coordinator |
| `SHARD_HOST_ID` | This host's name, default `local` |
| `SHARD_HOST_TOKEN` | This host's secret, 32–512 printable ASCII characters |
| `SHARD_COORDINATOR_URL` | Host connection URL, default `ws://127.0.0.1:8080/sharding` |
| `SHARD_COORDINATOR_HOST` | Coordinator's listening address, default `127.0.0.1` |
| `SHARD_COORDINATOR_PORT` | Coordinator's port, default `8080`; `0` selects a free port, reported by the `listening` record |
| `SHARD_STATE_PATH` | Persistent SQLite file, default `./sharding.sqlite`; relative to where you launch the coordinator |
| `SHARD_WORKERS` | Optional JSON array of host IDs, secrets and shard assignments |
| `SHARD_TLS_CERT`, `SHARD_TLS_KEY` | PEM certificate and private key paths for the coordinator's TLS listener |

The env file and default SQLite files are ignored by Git. Keep the SQLite file between restarts: it tracks ownership and Discord login allowances.

## More than one machine

Run one coordinator and one host process per machine. Give each host a unique ID and secret. On the coordinator, set explicit assignments, for example:

```dotenv
SHARD_COUNT=2
SHARD_WORKERS='[{"id":"hostA","token":"PASTE_HOST_A_SECRET_HERE","shards":[0]},{"id":"hostB","token":"PASTE_HOST_B_SECRET_HERE","shards":[1]}]'
SHARD_COORDINATOR_HOST=0.0.0.0
SHARD_TLS_CERT=/absolute/path/to/fullchain.pem
SHARD_TLS_KEY=/absolute/path/to/privkey.pem
```

Replace both secret placeholders with separately generated values. Assign every shard exactly once. Each host gets its own env file; host A's relevant settings look like:

```dotenv
DISCORD_TOKEN=YOUR_BOT_TOKEN
SHARD_HOST_ID=hostA
SHARD_HOST_TOKEN=PASTE_HOST_A_SECRET_HERE
SHARD_COORDINATOR_URL=wss://your-coordinator-hostname:8080/sharding
DEV_GUILD_ID=
```

Host B uses `hostB` and its own secret. Use a hostname that matches a trusted certificate and allow the coordinator port through your firewall. Remote connections require `wss://`; plain `ws://` is allowed only on localhost. The coordinator tells each host which shards to run, so shard assignments belong in the coordinator's configuration.

If a host crashes hard, its assignment can stay reserved. Confirm its old bot processes are stopped before calling `coordinator.releaseWorker('hostA')` in the running coordinator process, then restart that host. The example doesn't expose a remote recovery endpoint. Don't delete the state file to bypass ownership checks. Before changing assignments, stop all hosts cleanly and stop the coordinator; use a new state file for the new layout, keeping the old one.

## Check it without a token

```sh
bun examples/offline.ts
```

This starts a temporary coordinator, a host and two copies of the same bot with `--offline`. It checks distinct child processes, all three commands, broadcast stats and direct shard routing, then cleans up the processes and temporary database. Each shard reports that Discord login is disabled; the final record reports which checks passed and the responding shard/module counts. It checks the local wiring; a Discord login is still needed to verify live slash commands.

The independent engine example also runs locally:

```sh
bun examples/engine/offline.ts
```

It checks a mock gateway connection, a REST reply and session resume, then logs
the reply/connection counts. `examples/engine/live.ts` requires an explicit
`--live` flag and a configured `DISCORD_TOKEN`; without the flag it only logs
instructions. Its error callback uses safe event logging, readiness comes from
the engine's `ready` event, and interaction responses use the canonical
`respond({ type, data })` API.
