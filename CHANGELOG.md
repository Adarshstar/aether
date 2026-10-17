## [1.12.0-alpha / V8-Alpha] — 2026-10-17

### V8: Engine hardening pass
- **World/Chunk**: section-based (16×16×16) sparse storage replaces flat
  per-column arrays — empty/air sections now cost ~0 bytes instead of a full
  98,304-cell allocation per loaded column.
- **Pathfinder**: fixed a real bug where the node "pool" was wiped every
  search instead of reused (`releasePathNodes` did `pool.length = 0`); now
  nodes are genuinely recycled across searches. Added liquid-aware A* costs
  (swim-capable when `avoidLiquid` is off) and basic climbable-block support.
- **Arbitration layer**: new `Arbiter` (`src/decision/Arbitration.ts`) — a
  priority-stack control broker so `DecisionEngine` (reactive) and `Agent`
  (LLM-driven) can no longer issue conflicting movement/combat commands in
  the same tick. Survival-critical reactive behavior always preempts LLM
  proposals.
- **Combat/PvP merge**: `Combat` and `PvP` modules merged into a single
  `CombatController` (target-lock, cooldowns, kiting, shield timing) —
  removes duplicated target-tracking state.
- **Protocol fidelity fix**: found and fixed a real wire-format bug —
  `PlayerAuthInput`'s encoder wrote the real Bedrock varuint32-count +
  zigzag32 flag-list format, but the decoder still used an old fixed-width
  bitset, corrupting every field after the flag list (e.g. tick decoded as
  126 instead of 42). Also fixed `interactionModel` decode (was unsigned
  varint, should be `zigzag32` to match the encoder).
- **Observability**: `PerfMonitor` wired directly into `HealthDashboard`'s
  `/status` endpoint; tick-budget overruns (>45ms) now log an automatic
  warning.
- **Resilience**: `FallbackLLMClient` now serves its last-known-good response
  when every provider is down, instead of letting the agent loop error out.
  `LLMPlanner` adds adaptive history trimming to avoid token-limit failures
  on long sessions.
- **Ops**: new Guardian Loop v2 (`supervisor.sh`) with crash-reason logging,
  restart backoff, and log rotation; structured JSON logger (`logger.ts`);
  `OpenClawSync` event bridge for routing critical bot events back to the
  OpenClaw agent.
- **Memory**: `AetherMemory` persistent player notes fully wired into the
  `createAIBot` lifecycle (loaded at startup, autosaved, summarized into the
  LLM system prompt).
- **Security**: removed accidentally-committed MSA/Xbox auth token files and
  a hardcoded Gemini API key from git history; hardened `.gitignore`.

## [1.11.0-alpha] — 2026-10-08

### Stay connected while playing
- Stopped blind `restartIce` (it killed the NetherNet datachannel)
- Coalesced reconnects to a single in-flight login
- Ignored other players' MovePlayer packets
- 18s post-spawn movement lock, slower walk, gravity on loaded chunks
- Place-block uses the held hotbar item
- `examples/play-full.ts` is a single loop with quiet Gemini

## [1.9.0-alpha] — 2026-10-07

### Physics engine upgrade
- Separating-axis AABB collision (X/Y/Z)
- Auto step-up, multi-point ground sampling
- Water/lava drag & buoyancy, ladder/scaffold climb
- Ice/slime friction, velocity acceleration (not hard-set)
- Fixed substeps, terminal velocity, raycast helper
- `bot.raycastBlock()`; physicsTick integration improved

## [1.8.1-alpha] — 2026-10-07

### Architecture + CI
- Clean layered `index.ts` public API (no duplicate exports)
- `docs/ARCHITECTURE.md` layer diagram and rules
- GitHub Actions: test matrix, build, layer checks, mock join validation
- Window.count, registry test fixes, soft probe failure for CI without BDS
- **113 tests passing** locally

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
