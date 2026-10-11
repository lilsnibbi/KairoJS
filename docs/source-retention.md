# Source retention and attribution

KairoJS ships raw TypeScript and retains adapted third-party source. This document is included in the package alongside the licences below. KairoJS changes include reorganised modules, Bun startup and transport code, lifecycle management and the scheduling backends. Attribution does not imply compatibility with an upstream API, database or wire protocol.

## Retained sources

| Source | Retained or adapted areas | Licence and notices |
| --- | --- | --- |
| [Sapphire framework](https://github.com/sapphiredev/framework), [pieces](https://github.com/sapphiredev/pieces), [plugins](https://github.com/sapphiredev/plugins) and [utilities](https://github.com/sapphiredev/utilities) | Module and command abstractions, arguments, preconditions, events, extension APIs and utilities, including the Sapphire lexure parser | MIT; Copyright © 2020 The Sapphire Community and its contributors. The permission notice is reproduced below. |
| [discord-sharding](https://github.com/lilsnibbi/discord-sharding) | Shard coordination, ownership, identify scheduling and host-supervision design, reworked for the KairoJS protocol | Apache-2.0; Copyright 2021 Noel Buechler; Copyright 2015 Amish Shah. The full licence is retained in [src/sharding/LICENSE](../src/sharding/LICENSE). |
| [discord.js](https://github.com/discordjs/discord.js) | Interaction option resolvers under `src/utilities/discord/constants/resolvers/`, with source links in each file | Apache-2.0; Copyright 2021 Noel Buechler; Copyright 2015 Amish Shah. See the [retained Apache-2.0 licence](../src/sharding/LICENSE). |
| [twemoji-parser](https://github.com/jdecked/twemoji-parser) | `src/utilities/discord/constants/TwemojiRegex.ts` | MIT; Copyright (c) 2022–present Jason Sofonia & Justine De Caires; Copyright (c) 2018–2021 Twitter. The permission notice is reproduced below. |
| [Lodash](https://github.com/lodash/lodash) | `src/utilities/function/debounce/` | The complete [retained licence and Underscore attribution](../src/utilities/function/debounce/LICENSE) are shipped beside the source. |
| Aura Román | `src/utilities/text/cutText.ts` and `splitText.ts` | Copyright 2019 Aura Román; Apache-2.0, as recorded in the source headers. See the [retained Apache-2.0 licence](../src/sharding/LICENSE). |
| DiscordPagination / lilsnibbi | `src/utilities/discord/pagination/Pagination.ts` | Copyright (c) 2026 lilsnibbi; [MIT](../LICENSE), as recorded in the source header. |

Other installed dependencies retain their own licences in their packages. The root [LICENSE](../LICENSE) covers KairoJS's MIT-licensed work; the package's `MIT AND Apache-2.0` declaration reflects the retained source above.

## MIT permission notice

The following notice applies to the Sapphire and twemoji-parser copyright notices listed above.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
