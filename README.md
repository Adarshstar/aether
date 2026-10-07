# Aether 1.6.1-alpha — Advanced Bedrock AI Bot Engine

For **BDS 1.26.52.3** / protocol **2193** / NetherNet.

## This release

| Track | What landed |
|-------|-------------|
| **Live join validation** | `bun run validate:join` — probe + mock WebRTC + optional live werift |
| **Registries** | Expanded blocks (tags/ores/containers) + items (food/tools/materials) |
| **Crafting + UI** | Recipe craft simulation, chest/crafting/furnace windows, `bot.craft()` |
| **Benchmarks** | `bun run bench:path` — pathfinder latency baselines |

## Quick commands

```bash
bun run validate:join
bun run bench:path
bun test
AI_API_KEY=sk-... bun run examples/full-agent.ts
```

```ts
bot.craft("stick");
const chest = bot.openChest();
chest.setSlot(0, { networkId: 4, count: 32 } as any);
```

## Docs

[LIVE_JOIN](docs/LIVE_JOIN.md) · [CHANGELOG](CHANGELOG.md) · [ROADMAP](ROADMAP.md)

## License

MIT
