## [1.8.0-alpha] — 2026-10-07

### Custom & undefined work
- ScriptRunner: define/exec custom handlers, macros, variables
- Mini-language evalLines (chat/goto/dig/custom/work/…)
- Open work board: postWork / resolveWork / cancel
- Builtins: mine_area, pipeline, collect, undefined
- Commands: !work !resolve !custom !eval !macro
- Agent `custom` actions route to scripts (or open work)

## [1.7.1-alpha] — 2026-10-07

### Fast join
- Auto WebRTC loader (werift/wrtc/global)
- Parallel probe + WebRTC resolve
- Early ICE exit (≥2 candidates)
- Faster defaults: ICE 2.2s, signaling 8s, retry 350ms
- `examples/join-fast.ts` / `bun run join:fast`

## [1.7.0-alpha] — 2026-10-07

### Gap fill
- ItemStackRequest encoder (take/place/swap/consume/craft)
- StartGame block/item palette → registries
- BDSSession: AddEntity/AddPlayer/RemoveEntity, ContainerOpen/Close, CraftingData
- Bot wires entities into spatial index; craft sends stack request; equip → MobEquipment
- Farm module (harvestNearby, plantSeed)

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
