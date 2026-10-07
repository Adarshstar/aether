# Aether 1.5.0-alpha — BDS AI Bot Client Engine

AI bot client for **Minecraft Bedrock Dedicated Server 1.26.52.3** (protocol **2193**, NetherNet).

## Highlights (1.5.0)

- **Full Xbox / Microsoft login** — device code, refresh token, disk cache (`.aether-auth/`)
- **Decision engine** — modes: idle · explore · follow · goto · guard · ai
- **Chat commands** — `!goto` `!explore` `!follow` `!come` `!guard` `!eat` `!stop` `!ai` `!script` `!status`
- **Custom scripts** — register named behaviors
- **Chat brain** — optional AI replies to players
- **Explore module** — autonomous wandering
- Faster pathfinder defaults + real UseItem eating (1.4.3)

## Quick start (offline + AI)

```bash
AI_API_KEY=sk-... bun run examples/full-agent.ts
```

## Microsoft / Xbox login

```bash
bun run examples/microsoft-login.ts
# First run: open the URL and enter the code
# Later runs: cached refresh token
```

```ts
const bot = createBot({
  host: "play.example.com",
  username: "you@outlook.com",
  auth: "microsoft",
  offline: false,
  persistTokens: true,
});
```

## Commands (in-game chat)

| Command | Effect |
|---------|--------|
| `!help` | List commands |
| `!status` | HP, food, position |
| `!goto x y z` | Pathfind |
| `!explore [radius]` | Wander |
| `!follow <player>` / `!come` | Follow |
| `!guard` | Attack nearby hostiles |
| `!eat` / `!stop` | Eat / stop |
| `!ai <task>` | Hand control to LLM mode |
| `!script <name>` | Run custom script |

## Live BDS join

See [docs/LIVE_JOIN.md](docs/LIVE_JOIN.md) (WebRTC / werift required for real sessions).

## Docs

- [CHANGELOG.md](CHANGELOG.md) · [ROADMAP.md](ROADMAP.md) · [HANDOFF.md](HANDOFF.md) · [docs/LIVE_JOIN.md](docs/LIVE_JOIN.md)

## License

MIT
