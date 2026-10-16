# KairoJS

A modular Discord framework for Bun, written in TypeScript and built on discord.js. Organise your bot into commands, listeners and services, with explicit module loading and shared lifecycle management.

## Features

- Slash commands, context menus, message commands and interaction handlers.
- Argument parsing, preconditions, permissions and cooldowns.
- Localisation for replies and application commands through i18next.
- Scheduled tasks with in-memory or Redis-backed storage.
- Shard coordination, host supervision, typed messaging and opt-in [automatic scaling](docs/sharding-scaling.md).
- [Shard maintenance and recovery](docs/sharding-recovery.md), with per-process leases and bounded coordinator outages.
- [Live shard statistics](docs/sharding-stats.md) through `container.sharding.stats()`, with fresh samples and explicit failures.
- Pagination, validation, collections, time helpers and other utilities.

## Original engine milestone

The experimental [native Discord engine](docs/engine.md) is available through `kairojs/engine`. It owns gateway sessions, REST and cache while the existing framework keeps its current runtime. Run `bun examples/engine/offline.ts` for a local connect/reply/resume demonstration with no Discord credentials.

## Getting started

Use **Bun 1.4.3 or newer**. KairoJS runs TypeScript directly; no compilation step is required.

From this repository, install dependencies:

```sh
bun install --frozen-lockfile
```

The [example bot](examples/README.md) includes a coordinator, shard host, three slash commands and an [env template](examples/.env.example).

Copy `examples/.env.example` to `examples/.env`, fill in your bot token and a generated host secret, then start these in separate terminals:

```sh
bun --env-file=examples/.env examples/coordinator.ts
bun --env-file=examples/.env examples/host.ts
```

The host starts two bot processes by default. Try `/ping`, `/stats` and `/shard`. The example guide covers server setup, secrets and running hosts on separate machines.

### Create your own bot

In a separate Bun project, install your local KairoJS checkout and discord.js. Replace the path with your checkout location:

```sh
bun add /absolute/path/to/KairoJS discord.js
```

Use this layout:

```text
my-bot/
├── commands/
│   └── ping.ts
├── .env
└── index.ts
```

Create `index.ts`:

```ts
import { GatewayIntentBits } from "discord.js";
import { KairoClient } from "kairojs";

const token = Bun.env.DISCORD_TOKEN;
if (!token) throw new Error("Set DISCORD_TOKEN in your .env file.");

const client = new KairoClient({
	intents: [GatewayIntentBits.Guilds],
	root: import.meta.dir,
	modules: { commands: "commands/**/*.ts" },
});

process.once("SIGINT", () => {
	void client.destroy();
});

await client.login(token);
```

Create `commands/ping.ts`:

```ts
import { Command } from "kairojs";

export default class PingCommand extends Command {
	static override options: Command.Options = {
		description: "Check whether the bot is awake.",
	};

	override registerApplicationCommands(registry: Command.Registry): void {
		registry.registerChatInputCommand((builder) =>
			builder.setName(this.name).setDescription(this.description),
		);
	}

	override async chatInputRun(
		interaction: Command.ChatInputCommandInteraction,
	): Promise<void> {
		await interaction.reply("Pong!");
	}
}
```

Set `DISCORD_TOKEN` in your bot's `.env`, add `.env` to its `.gitignore`, then run:

```sh
bun index.ts
```

The filename supplies the command name. Module paths are explicit glob patterns relative to `root`; folders are not scanned automatically. Restart the process after changing code, module patterns or translations.

## Imports

Import from the package root or a focused entrypoint:

```ts
import { KairoClient } from "kairojs/client";
import { Command, Precondition } from "kairojs/commands";
import { Task } from "kairojs/scheduling";
import { Result } from "kairojs/utilities";
```

Other entrypoints include `modules`, `events`, `extensions`, `localisation`, `services`, `sharding`, `discord`, `time` and `validation`. Root and category imports share the same classes and state. Keep TypeScript declaration augmentation on `kairojs`.

## Examples

| Example                              | Demonstrates                                                            |
| ------------------------------------ | ----------------------------------------------------------------------- |
| [Example guide](examples/README.md)  | Setup, environment settings, shard roles and running across machines    |
| [Bot](examples/bot.ts)               | Shared entrypoint for each managed shard                                |
| [Commands](examples/commands/)       | Local replies, broadcasts and single-shard requests                     |
| [Offline check](examples/offline.ts) | The same bot modules in two real child processes, without Discord login |

Try `bun examples/offline.ts` without a Discord token.

## Development

Use Bun **1.4.3**.

| Command              | Purpose                                    |
| -------------------- | ------------------------------------------ |
| `bun test`           | Run Bun tests                              |
| `bun run typecheck`  | Check TypeScript without emitting files    |
| `bun run lint:check` | Check formatting and lint rules with Biome |
| `bun run format`     | Apply formatting                           |

Redis integration tests require `KAIRO_TEST_REDIS_URL` pointing to a disposable Redis instance; otherwise those tests are skipped locally.

Run `bun scripts/ci.ts` with that loopback Redis URL for complete validation: zero skipped tests, native Bun type checking, Biome and both offline examples. On the Ubuntu x64 CI runner, `bash scripts/checkActions.sh` also checks the workflow with checksum-pinned actionlint.

See [migration notes](BREAKING_CHANGES.md) when moving from an earlier KairoJS API.

See [console logging](docs/console-logging.md) for readable text/JSON output,
redaction, custom logger compatibility and the offline `bun scripts/logging-demo.ts` preview.

Source lives in `src/`, tests in `tests/` and runnable examples in `examples/`. See [Repository Guidelines](AGENTS.md) for contribution conventions.

## Licence

The package declares `MIT AND Apache-2.0`. See the root [MIT licence](LICENSE), the [sharding Apache-2.0 licence](src/sharding/LICENSE), the shipped [source attribution](docs/source-retention.md) and retained notices alongside individual modules.
