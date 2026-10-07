# Aether 1.6.0-alpha — Advanced Bedrock AI Bot Engine

High-performance AI bot engine for **Minecraft Bedrock Dedicated Server 1.26.52.3** (protocol **2193**, NetherNet).

## Beyond Mineflayer (different edition — advanced where it matters)

Mineflayer is the gold standard for **Java**. Aether targets **Bedrock** and ships systems Mineflayer does not include first-class:

| Area | Aether 1.6 |
|------|------------|
| Edition | Bedrock / NetherNet / Xbox |
| AI | LLM planner + decision + chat brain |
| Human-like | Personalities, fidget, hesitation, autonomous |
| Pathfinding | Packed-key A*, node pool, path cache, 20k nodes |
| Entity queries | **Spatial hash grid** (not full linear scan) |
| Tasks | Priority multi-step **TaskQueue** |
| Perf | **PerfMonitor** (path ms, cache hits, query counts) |
| Commands | `!` router + scripts |

## Performance (1.6.0)

- Spatial index for nearest-entity
- Pathfinder: numeric keys, object pool, short-lived path cache
- Humanized movement still on
- Task queue for chained dig/goto/collect

```ts
import { createAIBot, globalPerf } from "./index";

const bot = createAIBot({
  host: "127.0.0.1",
  username: "Aether",
  offline: true,
  aiApiKey: process.env.AI_API_KEY!,
  personality: "explorer",
  autonomous: true,
});

bot.on("spawn", () => {
  bot.tasks.push(
    { type: "goto", goal: { x: 100, y: 70, z: 100 }, priority: 1 },
    { type: "chat", message: "made it" },
  );
  console.log(globalPerf.snapshot());
});
```

## Honest note

Live BDS join still needs WebRTC (`docs/LIVE_JOIN.md`). Gameplay depth (craft/chests) is thinner than Mineflayer on Java — Aether leads on **Bedrock + AI + human/autonomy + query/path speed architecture**.

## License

MIT
