# Aether 1.5.1-alpha — Human-like BDS AI Bot Engine

AI bot client for **Minecraft Bedrock Dedicated Server 1.26.52.3** (protocol **2193**).

## Human-like behavior (1.5.1)

Bots are no longer pure automata:

- **Personalities** — explorer, guard, social, coward, berserker, afk_buddy
- **Human movement** — path pauses, variable sprint, look-ahead, aim noise
- **Fidget & attention** — look around, glance at players, idle jump/sneak
- **Hesitation** — reaction delays, freeze when hurt
- **Autonomous mode** — personality picks explore / socialize / fight
- **LLM prompt** tuned for casual player-like chat and imperfect plans

```ts
const bot = createAIBot({
  host: "127.0.0.1",
  username: "Aether",
  offline: true,
  aiApiKey: process.env.AI_API_KEY!,
  personality: "explorer", // or "social" | "guard" | ...
  autonomous: true,
});
```

## Also included (1.5.0+)

Xbox login + token cache · decision modes · `!` commands · scripts · explore · chat brain · real UseItem eating

```bash
AI_API_KEY=sk-... bun run examples/full-agent.ts
bun run examples/microsoft-login.ts
```

## Docs

[CHANGELOG](CHANGELOG.md) · [ROADMAP](ROADMAP.md) · [LIVE_JOIN](docs/LIVE_JOIN.md) · [HANDOFF](HANDOFF.md)

## License

MIT
