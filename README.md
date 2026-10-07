# Aether 1.4.1-alpha — BDS AI Bot Client Engine

AI bot client engine for **Minecraft Bedrock Dedicated Server 1.26.52.3** (protocol **2193**).

## What's new in 1.4.1-alpha

- **NetherNet reliability**: retries with exponential backoff, better ICE gathering, health monitor, extra STUN servers
- **Expanded AI planner**: dig / place / equip / eat / follow_entity / remember + richer observations
- **Survival module**: automatic low-health retreat and auto-eat
- Roadmap and handoff docs updated

## Real BDS path (NetherNet)

For BDS with `transport=nethernet` (default on 1.26.5x):

1. **GET** `http://host:19132/v1/join` — probe (JSON: `protocol`, `version`, `networkId`, MOTD)
2. **WebRTC** `RTCPeerConnection` + data channels `ReliableDataChannel` / `UnreliableDataChannel`
3. **POST** `http://host:19132/v1/join/{networkId}` — SDP offer (optional `a=identity` ES384) → answer
4. Fragment header + compression (DEFLATE / Snappy)
5. Login sequence → StartGame → spawn
6. 20 Hz `PlayerAuthInput`

```ts
import { createBot, createAIBot, createSurvival } from "aether-bot";

const bot = createBot({
  host: "127.0.0.1",
  port: 19132,
  username: "Aether",
  offline: true,
  transport: "nethernet",
  // Optional reliability tuning:
  // maxRetries: 4,
  // iceGatherTimeoutMs: 6000,
  // healthCheckIntervalMs: 5000,
});

await bot.connect();
bot.on("spawn", () => {
  bot.chat("Aether 1.4.1 online");
  const survival = createSurvival(bot, { autoEat: true });
  survival.start();
});
```

## AI bot

```bash
AI_API_KEY=sk-... bun run examples/ai-bot.ts
```

`createAIBot({ aiApiKey, aiBaseUrl, aiModel })` is the stable high-level API.

New planner actions include `dig`, `place`, `equip`, `eat`, `follow_entity`, `remember`.

## Tests

```bash
bun test
```

## Docs

- [ROADMAP.md](ROADMAP.md)
- [HANDOFF.md](HANDOFF.md) — full architecture for continuing agents
- [docs/MINEFLAYER.md](docs/MINEFLAYER.md)

## License

MIT
