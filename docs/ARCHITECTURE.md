# Aether Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  examples / createAIBot / createBot                         │
├─────────────────────────────────────────────────────────────┤
│  AI & Automation                                            │
│  Agent · LLMPlanner · FallbackLLM · DecisionEngine          │
│  Arbiter (V8) · HumanBehavior · ScriptRunner · TaskQueue    │
│  Commands · Farm · ChatBrain · AetherMemory                 │
├─────────────────────────────────────────────────────────────┤
│  Bot core                                                   │
│  Bot · Inventory · CombatController (V8: Combat+PvP merge)  │
│  PathFollower · Physics · HealthDashboard · PerfMonitor     │
├─────────────────────────────────────────────────────────────┤
│  Session / Protocol                                         │
│  BDSSession · ProtocolClient · codecs · ItemStackRequest    │
│  PlayerAuthInput · InventoryTransaction                     │
├─────────────────────────────────────────────────────────────┤
│  Transport                                                  │
│  NetherNet · WebRTC loader · SDP identity                   │
├─────────────────────────────────────────────────────────────┤
│  World data                                                 │
│  World · Chunk (V8: section-based sparse storage)           │
│  Pathfinder (V8: pooled nodes, liquid/climb aware)          │
│  Registries · Goals                                         │
└─────────────────────────────────────────────────────────────┘
```

## V8 additions (current)

- **Arbiter** (`src/decision/Arbitration.ts`): priority-stack control broker so
  `DecisionEngine` (reactive) and `Agent` (LLM-driven) never fight over
  movement/combat in the same tick. Survival-critical reactive behavior always
  outranks LLM proposals.
- **CombatController** (`src/combat/Combat.ts`): merged what used to be two
  separate modules (`Combat` + `PvP`) into one target-lock/cooldown/kiting/
  shield controller — single source of truth for combat state.
- **Chunk** (`src/world/Chunk.ts`): lazy 16×16×16 section storage instead of a
  flat per-column array; empty (air) sections cost ~0 bytes.
- **Pathfinder**: real cross-search node-pool reuse (was wiped every search
  pre-V8), liquid-aware costs, and basic climbable-block support.
- **PerfMonitor → HealthDashboard**: `/status` now includes a live perf
  snapshot, and tick overruns log a warning automatically.

## Layer rules

1. **Transport** has no knowledge of Bot or AI.
2. **Protocol** depends on world/registry only as needed for decode apply.
3. **Bot** owns gameplay APIs; session is an implementation detail.
4. **AI / scripts** call Bot public methods — never protocol packets directly (except via Bot/session helpers).
5. **Public API** is only `index.ts` — keep it deduplicated.

## Extension points

| Mechanism | Use for |
|-----------|---------|
| `bot.scripts.define` | Custom / undefined work |
| `bot.loadPlugin` | Mineflayer-style plugins |
| `Agent` custom actions | LLM-driven custom names |
| `TaskQueue` | Priority multi-step jobs |
| `DecisionEngine` modes | Reactive behavior without LLM |

## CI

GitHub Actions (`.github/workflows/ci.yml`):

- `bun test` on Bun 1.1.x + latest  
- Pathfinder bench  
- Mock join validation  
- `bun build index.ts`  
- Layer boundary grep checks  
- Version consistency  

## Target

BDS **1.26.52.3** · protocol **2193** · NetherNet (HTTP signaling + WebRTC data channels)

## Roadmap

See [ROADMAP_V9.md](../ROADMAP_V9.md) for what's next (live-server hardening,
Pathfinder V3, multi-agent coordination, operator tooling). [ROADMAP_V7.md](../ROADMAP_V7.md)
covers completed V7 work; V8 is summarized above.
