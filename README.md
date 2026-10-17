# Aether 1.12.0-alpha (V8-Alpha)

AI bot engine for **Minecraft Bedrock BDS 1.26.52.3** (protocol **2193**, NetherNet).

## V8-Alpha highlights

- **Sparse chunk storage**: lazy 16×16×16 sections, ~0 cost for air-heavy columns
- **Pathfinder**: real cross-search node-pool reuse, liquid-aware costs, climbable blocks
- **Arbitration layer**: priority-stack broker so reactive `DecisionEngine` and the
  LLM-driven `Agent` never fight for movement/combat control
- **CombatController**: merged `Combat` + `PvP` into one target-lock/kiting/shield module
- **Protocol fidelity**: fixed a real `PlayerAuthInput` encode/decode mismatch
- **HealthDashboard**: `/status` now includes a live `PerfMonitor` snapshot
- **Resilience**: `FallbackLLMClient` serves last-known-good on total provider outage
- **Ops**: Guardian Loop v2 supervisor, structured JSON logging, OpenClaw event sync
- **Persistent memory**: player notes/interactions survive restarts

See [CHANGELOG.md](CHANGELOG.md) for full details and [ROADMAP_V9.md](ROADMAP_V9.md)
for what's next.

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — layered design:

`Transport → Protocol → Bot → AI / Scripts / Decision`

## CI

GitHub Actions runs on every push/PR:

- `bun test` (120+ tests)
- Pathfinder benchmarks  
- Mock join validation  
- `bun build index.ts --target=bun`  
- Layer boundary checks  

## Quick start

```bash
bun install
bun test
bun add werift && bun run join:fast
```

## License

MIT
