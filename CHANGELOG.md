## [1.6.1-alpha] — 2026-10-07

- Live join validation harness (`examples/live-join-validate.ts`, `bun run validate:join`)
- Expanded BlockRegistry (tags, ores, containers) + ItemRegistry (food/tools)
- RecipeRegistry.canCraft/craft + more recipes; WindowManager chest/crafting/furnace
- `bot.craft()`, `openChest()`, `openCrafting()`
- Pathfinder benchmark suite (`tests/pathfinder-bench.test.ts`)

## [1.6.0-alpha] — 2026-10-07

### Performance & advanced systems
- SpatialIndex for entity neighborhood / nearest queries
- Pathfinder: packed keys, node pool, path cache, 20k max nodes
- PerfMonitor + globalPerf instrumentation
- TaskQueue multi-step priority tasks
- World findBlock nearest-shell refinement


## [1.5.1-alpha] — 2026-10-07

### Human-like players
- Personality system (presets + traits)
- HumanBehavior: look-around, fidget, hesitation, ambient chat
- Humanized PathFollower (pauses, variable sprint, look-ahead)
- Decision mode `autonomous` driven by personality
- LLM planner rules for casual human play

# Changelog

## [1.5.0-alpha] — 2026-10-07

### Xbox / auth
- Full device-code + refresh-token Microsoft login
- Token disk cache (`.aether-auth/`)
- Clearer XBL/XSTS/MC error messages
- Dual XSTS attempt (MC services + Xbox Live)

### Architecture & AI
- **DecisionEngine** — high-level modes (explore, follow, goto, guard, ai)
- **CommandRouter** — in-game `!` commands
- **ScriptRunner** — custom named scripts
- **ExploreModule** — autonomous exploration
- **ChatBrain** — LLM replies to player chat
- `createAIBot` wires the full stack on spawn
- Pathfinder `maxNodes` 16k + avoidLiquid

### Prior
- 1.4.3 UseItem eating + live-join checklist
- 1.4.2 auto-reconnect, auth-input edge cases, WebRTC helper
- 1.4.1 NetherNet reliability, Survival, expanded planner
