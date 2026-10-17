# 🚀 Aether Engine — V9 Roadmap
_Status: DRAFT — authored 2026-10-17, following V8-Alpha completion_

V8 hardened the engine internals (storage, pathing, arbitration, combat, protocol
fidelity, observability, resilience, persistence). V9 shifts focus outward:
**real-world reliability against a live BDS server, smarter multi-agent behavior,
and operator-facing tooling.** Nothing here is cosmetic — each phase closes a
concrete gap that blocks Aether from running unattended on a real server for
days at a time.

## Phase 1 — 🌐 Live-Server Hardening (Priority: NOW)
Goal: survive real BDS traffic, not just synthetic tests.
- [ ] **Full chunk decode fidelity**: verify LevelChunk/SubChunk decode against real
      BDS 1.26.52.3 packet captures (not just round-trip unit tests) — paletted
      biome layers, border blocks, and non-overworld dimensions (Nether/End height).
- [ ] **PlayerAuthInput full flag coverage**: audit all 60+ Bedrock input flags
      (not just the bitset that was fixed in V8) against the actual proto enum,
      including client-predicted blocking/riding/gliding states.
- [ ] **Reconnect & resume state machine**: formalize `autoReconnect` into a proper
      state machine (DISCONNECTED → RECONNECTING → RESYNCING_WORLD → ACTIVE) so a
      reconnect doesn't leave DecisionEngine/Agent/Arbiter in stale state.
- [ ] **Entity metadata completeness**: parse full Bedrock entity metadata/flags
      (currently partial) so mob type/armor/potion-effect detection is reliable
      for combat targeting and survival logic.
- [ ] **Container/inventory transaction edge cases**: multi-slot drag, shift-click
      transfer, crafting table grid — currently only basic transactions are tested.

## Phase 2 — 🧭 Pathfinder V3 (Parkour + 3D awareness)
Goal: close the gap with mineflayer-pathfinder's terrain handling (flagged as a
known weakness in the Mineflayer comparison doc).
- [ ] **Parkour gap-jumping**: allow 2-3 block horizontal jumps with sprint,
      not just adjacent-cell moves.
- [ ] **Scaffolding/bridge placement**: let the pathfinder place a block
      mid-path when crossing a gap with no ground, consuming inventory blocks.
- [ ] **Boat/minecart path segments**: treat water surface + boat as a distinct
      movement mode with its own cost function (separate from swimming).
- [ ] **Vertical shaft awareness**: safe-fall detection (water/hay bale landing)
      vs. fall-damage avoidance, so explore mode doesn't suicide off cliffs.
- [ ] **Path smoothing**: post-process A* output to cut zig-zag waypoints into
      straight-line segments PathFollower can walk without micro-stuttering.

## Phase 3 — 🧠 Multi-Agent Coordination
Goal: Aether bots are more useful in groups, not just solo survival loops.
- [ ] **Shared world-knowledge bus**: when multiple Aether bots run on the same
      server, let them publish/subscribe known ore veins, bases, and danger
      zones (builds on V8's single-bot `AetherMemory`) via a lightweight local
      broker — no server plugin required.
- [ ] **Escort/bodyguard mode**: `follow_entity` + `guard` combo (carried over
      from V7 Phase 4, never implemented) — bot paths with a player and reactively
      fights threats within a radius without losing the follow target.
- [ ] **Role assignment**: when N bots are online together, assign
      miner/guard/builder roles from a shared task queue instead of every bot
      running identical personality-driven autonomous logic.
- [ ] **Chat relay between bots**: structured (non-LLM) inter-bot signaling over
      in-game chat or whispers, e.g. "danger at X,Y,Z" broadcasts.

## Phase 4 — 🛠️ Operator Tooling & Observability
Goal: make Aether debuggable and controllable by a human operator in real time,
not just via logs after the fact.
- [ ] **HealthDashboard v2**: add a `/history` endpoint (rolling perf + HP/food
      time series) and a minimal built-in HTML view, not just raw JSON.
- [ ] **Live command WebSocket**: push decision-mode/position updates to a
      connected dashboard client in real time instead of polling `/status`.
- [ ] **Replay/record mode**: optionally record a session's full action +
      observation stream to disk for later debugging/replay without needing
      the live server.
- [ ] **Crash triage**: Guardian Loop v2 (V8) logs crashes; V9 adds automatic
      stack-trace capture + classification (network vs. logic vs. OOM) in the
      structured logger.

## Phase 5 — ✨ New Capabilities
Stretch goals once Phases 1–4 are solid.
- [ ] **Redstone/automation awareness**: detect and interact with basic
      redstone contraptions (doors, farms) rather than treating them as opaque
      solid blocks.
- [ ] **Build-from-schematic**: load a simple block-list schematic and have the
      bot construct it using the V9 scaffolding-aware pathfinder.
- [ ] **Voice-chat text bridge** (carried over from V7 Phase 4, still deferred):
      revisit once a voice-to-text source is available on the target server.
- [ ] **Economy/trading loop**: villager trade optimization + item-value
      heuristics for a bot running a long-term "get rich" objective.

## Working order
1. **Phase 1** — a bot that silently mishandles live packets is worse than one
   that's merely feature-incomplete; correctness against the real server comes
   first.
2. **Phase 2** — pathfinding breadth is the single most visible gameplay gap
   vs. mineflayer-pathfinder today.
3. **Phase 3** — only valuable once solo behavior is reliable; multiplies the
   value of Phases 1–2 across a bot fleet.
4. **Phase 4** — ops tooling pays for itself once bots run unattended for days.
5. **Phase 5** — pure stretch goals, pick up opportunistically.

## Explicit non-goals for V9
- Rewriting the protocol layer (V8's fidelity audit found it fundamentally
  sound — PlayerAuthInput was the one real bug, now fixed).
- Supporting Minecraft Java Edition — Aether stays Bedrock-only by design.
- A general-purpose plugin marketplace — `bot.loadPlugin`/`scripts.define`
  stay the extension points; no app-store layer planned.
