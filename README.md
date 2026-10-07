# Aether 1.4.2-alpha — BDS AI Bot Client Engine

AI bot client engine for **Minecraft Bedrock Dedicated Server 1.26.52.3** (protocol **2193**).

## What's new in 1.4.2-alpha

- **Auto-reconnect** — `autoReconnect: true` with exponential backoff
- **PlayerAuthInput** — swim / glide / fly / ascend / descend flags
- **WebRTC helper** — easy werift / native RTC injection
- **SubChunk retries** — pending columns retried if no response
- Full reliability options on `BotOptions`

## Quick start

```ts
import { createBot, createSurvival } from "aether-bot";

const bot = createBot({
  host: "127.0.0.1",
  port: 19132,
  username: "Aether",
  offline: true,
  transport: "nethernet",
  autoReconnect: true,
  maxReconnectAttempts: 8,
  maxRetries: 4,
  iceGatherTimeoutMs: 6000,
});

bot.on("reconnecting", (attempt, delay) => {
  console.log(`Reconnect #${attempt} in ${delay}ms`);
});

await bot.connect();
bot.on("spawn", () => {
  bot.chat("Aether 1.4.2 online");
  createSurvival(bot).start();
});
```

### Live BDS + werift (Bun)

```bash
bun add werift
```

```ts
import { RTCPeerConnection } from "werift";
import { createBot, createWeriftPeerConnectionFactory } from "aether-bot";

const bot = createBot({
  host: "your-bds",
  port: 19132,
  username: "Aether",
  offline: true,
  strictWebRTC: true,
  createPeerConnection: createWeriftPeerConnectionFactory(RTCPeerConnection),
  autoReconnect: true,
});
```

## AI bot

```bash
AI_API_KEY=sk-... bun run examples/ai-bot.ts
```

Planner supports: chat, move_to, dig, place, equip, eat, follow_entity, attack, remember, …

## Tests

```bash
bun test
```

## Docs

- [ROADMAP.md](ROADMAP.md)
- [CHANGELOG.md](CHANGELOG.md)
- [HANDOFF.md](HANDOFF.md)

## License

MIT
