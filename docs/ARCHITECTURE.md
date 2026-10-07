# Aether Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  examples / createAIBot / createBot                         │
├─────────────────────────────────────────────────────────────┤
│  AI & Automation                                            │
│  Agent · LLMPlanner · DecisionEngine · HumanBehavior        │
│  ScriptRunner · TaskQueue · Commands · Farm · ChatBrain     │
├─────────────────────────────────────────────────────────────┤
│  Bot core                                                   │
│  Bot · Inventory · Combat · PathFollower · Physics          │
├─────────────────────────────────────────────────────────────┤
│  Session / Protocol                                         │
│  BDSSession · ProtocolClient · codecs · ItemStackRequest    │
│  PlayerAuthInput · InventoryTransaction                     │
├─────────────────────────────────────────────────────────────┤
│  Transport                                                  │
│  NetherNet · WebRTC loader · SDP identity                   │
├─────────────────────────────────────────────────────────────┤
│  World data                                                 │
│  World · Chunk · Pathfinder · Registries · Goals            │
└─────────────────────────────────────────────────────────────┘
```

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
