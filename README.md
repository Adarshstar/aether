# Aether 1.4.3-alpha — BDS AI Bot Client Engine

AI bot client engine for **Minecraft Bedrock Dedicated Server 1.26.52.3** (protocol **2193**).

## What's new in 1.4.3-alpha

- **Real eating**: `InventoryTransaction` UseItem (click air) + ReleaseItem
- `bot.eat()` / `bot.activateItem()` / `autoEat.eat()`
- **[Live join checklist](docs/LIVE_JOIN.md)** for real BDS

## Quick start

```ts
import { createBot, createSurvival } from "./index";

const bot = createBot({
  host: "127.0.0.1",
  port: 19132,
  username: "Aether",
  offline: true,
  autoReconnect: true,
});

await bot.connect();
bot.on("spawn", async () => {
  createSurvival(bot).start();
  bot.autoEat.enable(14);
  // await bot.eat(true);  // when food is in inventory on a live session
});
```

### Live BDS + werift

See **[docs/LIVE_JOIN.md](docs/LIVE_JOIN.md)**.

```bash
bun add werift
```

```ts
import { RTCPeerConnection } from "werift";
import { createBot, createWeriftPeerConnectionFactory } from "./index";

const bot = createBot({
  host: "127.0.0.1",
  port: 19132,
  username: "AetherLive",
  offline: true,
  strictWebRTC: true,
  createPeerConnection: createWeriftPeerConnectionFactory(RTCPeerConnection),
});
await bot.connect();
```

## AI bot (your API key)

```bash
AI_API_KEY=sk-... bun run examples/ai-bot.ts
```

Planner actions include `eat` and `use_item` (now backed by real packets when a live session exists).

## Docs

- [docs/LIVE_JOIN.md](docs/LIVE_JOIN.md) — join checklist  
- [ROADMAP.md](ROADMAP.md) · [CHANGELOG.md](CHANGELOG.md) · [HANDOFF.md](HANDOFF.md)

## License

MIT
